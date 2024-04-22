const express = require("express");
const fs = require("fs");
const { Buffer } = require("buffer");
const bodyParser = require("body-parser");

const PORT = 5000;
const app = express();

app.use(bodyParser.json({ limit: "10mb" }));

const cors = require("cors");
require("dotenv").config();

app.use(cors());

const API_URL = "https://api.linkedin.com/v2";
const AUTH_URL = "https://www.linkedin.com/oauth/v2/accessToken";

app.get("/api/auth", async (req, res) => {
  const body = {
    grant_type: "authorization_code",
    code: req.query.token,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    redirect_uri: process.env.REDIRECT_URI,
  };

  // In our implementation there should be two flows for posting to page/to profile to avoid having to get lists of orgs
  const orgUrl =
    "https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee&projection=(elements*(organizationalTarget~(id,localizedName,logoV2(original~:playableStreams))))";

  try {
    const tokenRes = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });
    if (!tokenRes.ok) throw new Error("Failed to obtain access token");

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const profileRes = await fetch(
      `${API_URL}/me?projection=(id,localizedFirstName,localizedLastName,profilePicture(displayImage~digitalmediaAsset:playableStreams))`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!profileRes.ok) throw new Error("Failed to fetch profile");
    const profileData = await profileRes.json();

    const profilePicture =
      profileData.profilePicture["displayImage~"].elements[0].identifiers[0]
        .identifier;

    const orgsReq = await fetch(orgUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Linkedin-Version": "202404",
        "X-Restli-Protocol-Version": "2.0.0",
      },
    });

    if (!orgsReq.ok) throw new Error("Unable to get organizations");
    const orgRes = await orgsReq.json();

    const orgFormatted = orgRes.elements.map((org) => {
      const orgTarget = org["organizationalTarget~"];
      const logo = orgTarget?.logoV2;
      let imagePath = "";
      if (logo)
        imagePath = logo["original~"].elements[0].identifiers[0].identifier;
      return {
        id: orgTarget.id,
        name: orgTarget.localizedName,
        image: imagePath,
      };
    });

    const resData = {
      profile_data: {
        id: profileData.id,
        display_name: `${profileData.localizedFirstName} ${profileData.localizedLastName}`,
        image: profilePicture ?? undefined,
      },
      token: tokenData,
      organizations: orgFormatted,
    };
    res.json(resData);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.post("/api/refresh", async (req, res) => {
  try {
    const body = {
      grant_type: "refresh_token",
      refresh_token: req.query.refresh_token,
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    };
    const tokenReq = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(body),
    });

    if (!tokenReq) throw new Error("Unable to get refresh token");
    const tokenRes = await tokenReq.json();
    res.json(tokenRes);
  } catch (err) {
    console.error(err);
    res.sendStatus(500).json(err);
  }
});

app.post("/api/create", async (req, res) => {
  // Data needed from FE:
  // User ID
  // Image in base64 format
  // Text in post
  // Current orgs
  const userId = req.query.user_id;
  const accessToken = req.query.token;
  if (!userId || !accessToken)
    res.status(500).json({ error: "Send user id and token" });
  if (!req.body || !req.body.imageBinary) {
    return res.status(400).json({ error: "Missing image data" });
  }

  const authorToUse = req.query.organization_id
    ? `urn:li:organization:${req.query.organization_id}`
    : `urn:li:person:${userId}`;

  try {
    // Start of creating image for linkedIn
    const bodyData = {
      registerUploadRequest: {
        owner: authorToUse,
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        serviceRelationships: [
          {
            identifier: "urn:li:userGeneratedContent",
            relationshipType: "OWNER",
          },
        ],
        supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
      },
    };

    const createImageReq = await fetch(
      `${API_URL}/assets?action=registerUpload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(bodyData),
      }
    );

    if (!createImageReq.ok) throw new Error("Unable to create image post");
    const createImageRes = await createImageReq.json();
    // End of creating image
    const linkedInAsset = createImageRes.value.asset;
    const uploadUrl =
      createImageRes.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;

    if (!uploadUrl) throw new Error("No upload image url");

    // Extract image data from request body
    const binaryData = Buffer.from(req.body.imageBinary, "base64");

    // Prepare the image data for LinkedIn API
    const uploadImgReq = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "image/png",
      },
      body: binaryData,
    });

    if (!uploadImgReq.ok) throw new Error("Error uploading image");
    // End of uploading image
    const visibilityToUse = req.query.organization_id ? "PUBLIC" : "CONTAINER";
    // I use a container (linkedin group i started for this testing) to avoid posting to my main linkedin account, but can remove
    const containerToUse = req.query.organization_id
      ? undefined
      : "urn:li:group:13019260";
    const postData = {
      author: authorToUse,
      // There are a few post lifecycle states, but on creation only one valid is published
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          media: [
            {
              media: linkedInAsset,
              status: "READY",
              title: {
                attributes: [],
                text: req.query.title,
              },
            },
          ],
          shareCommentary: {
            attributes: [],
            text: req.query.title,
          },
          shareMediaCategory: "IMAGE",
        },
      },
      containerEntity: containerToUse,
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": visibilityToUse,
      },
    };
    const postReq = await fetch(`${API_URL}/ugcPosts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postData),
    });

    if (!postReq.ok) throw new Error("Unable to post");
    const postRes = await postReq.json();
    res.sendStatus(200).json(postRes);
  } catch (err) {
    console.log(err);
    res.sendStatus(500).json(err);
  }
});

app.listen(PORT, () => console.log(`start listening on port : ${PORT}`));
