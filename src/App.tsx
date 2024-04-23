import React from "react";
import Cookies from "js-cookie";
import { Auth } from "./Auth";
import "./App.css";
import { ProfileInfo } from "./ProfileInfo";
import { getTokenFromRefresh } from "./utils/getTokenFromRefresh";

function App() {
  const profileCookie = Cookies.get("profile-data");
  const organizationCookie = Cookies.get("linkedin-organization-data");
  const parsedProfile = profileCookie ? JSON.parse(profileCookie) : undefined;
  const parsedOrgs = organizationCookie
    ? JSON.parse(organizationCookie)
    : undefined;
  const [profileData, setProfileData] =
    React.useState<Record<string, unknown>>(parsedProfile);
  const [organizations, setOrganizationsData] =
    React.useState<Record<string, unknown>[]>(parsedOrgs);
  const [postMode, setPostMode] = React.useState<"personal" | "org">(
    "personal"
  );
  const [multiImage, setMultiImage] = React.useState(false)
  const [currentOrg, setCurrentOrg] = React.useState<Record<string, unknown>>();
  const [token, setToken] = React.useState(
    Cookies.get("linkedin-access-token")
  );
  const refreshToken = Cookies.get("linkedin-refresh-token");

  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    // Draw image to canvas, kinda closest to actual editor stuff I could think to do
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.height = 500;
    canvas.width = 888;
    const ctx = canvas.getContext("2d");
    const imgForCanvas = new Image();
    imgForCanvas.crossOrigin = "anonymous";
    imgForCanvas.src =
      "https://static.vecteezy.work/system/resources/thumbnails/020/012/634/original/web3-crypto-consulting-presentation-template-free-editor_template.jpeg?nocache=true&last_updated=1685540486";
    imgForCanvas.onload = () => {
      ctx?.drawImage(imgForCanvas, 0, 0, canvas.width, canvas.height);
    };
  }, [token]);

  const handleRefresh = async () => {
    if (!refreshToken) return;

    const data = await getTokenFromRefresh(refreshToken);
    setToken(data.access_token);
  };

  React.useEffect(() => {
    // Refresh token if expired
    if (token || !refreshToken) return;
    handleRefresh();
  }, []);

  const generateAPIParams = (args: Record<string, unknown>): string => {
    const argsToQuery: Record<string, string> = {};

    for (const prop in args) {
      if (args[prop]) argsToQuery[prop] = `${args[prop]}`;
    }

    const searchParams = new URLSearchParams(argsToQuery);
    return searchParams.toString();
  };

  const handleCreatePost = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageDataUrl = canvas.toDataURL("image/png");
    const base64Data = imageDataUrl.replace(
      /^data:image\/(png|jpg|jpeg);base64,/,
      ""
    );

    const createParams = generateAPIParams({
      token,
      user_id: profileData.id,
      title: multiImage ? 'Test multi image post' : 'Test single image post',
      organization_id: currentOrg ? currentOrg.id : undefined,
      multi_image: multiImage
    });

    try {
      const response = await fetch(
        `http://localhost:5000/api/create?${createParams}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageBinary: base64Data }),
        }
      );

      if (response.ok) {
        console.log("Uploaded image successfully!");
      } else {
        console.error("Unable to upload image");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOrgClick = (org: Record<string, unknown>) => {
    setPostMode("org");
    setCurrentOrg(org);
  };

  return (
    <>
      <h1>LinkedIn Post Maker or Something</h1>
      <div className="post-section">
        {!token && !refreshToken && (
          <Auth
            setAuthToken={setToken}
            setProfileData={setProfileData}
            setOrgsData={setOrganizationsData}
          />
        )}
        {token && profileData && (
          <>
            <div className="post-method-wrapper">
              <h3
                className={`post-method select-item ${
                  postMode === "personal" && "method-active"
                }`}
              >
                Post as Myself
              </h3>
              <h3
                className={`post-method select-item ${
                  postMode === "org" && "method-active"
                }`}
              >
                Post as an Org
              </h3>
            </div>
            <div className="org-item">
              <input type="checkbox" checked={multiImage} onChange={e => setMultiImage(e.target.checked)} name="multi-image"></input>
              <label htmlFor="multi-image">Multi-Image Post</label>
            </div>
            <ProfileInfo
              profileData={profileData}
              onClick={() => setPostMode("personal")}
            />
            {organizations &&
              organizations.map((org) => {
                return (
                  <div
                    key={org.id as string}
                    className={`org-item profile-info ${
                      postMode === "org" && org.name === currentOrg?.name
                        ? "method-active"
                        : ""
                    }`}
                    onClick={() => handleOrgClick(org)}
                    key={org.id}
                  >
                    <img src={org.image as string} className="profile-pic" />
                    <p>{(org.name as string) ?? ""}</p>
                  </div>
                );
              })}
            <button className="select-item" onClick={handleCreatePost}>
              Create Post
            </button>
            <h3>Canvas to upload:</h3>
            <canvas className="canvas-image" ref={canvasRef}></canvas>
          </>
        )}
      </div>
    </>
  );
}

export default App;
