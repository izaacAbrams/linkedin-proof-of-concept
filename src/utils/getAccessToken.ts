import Cookies from "js-cookie";

export const getAccessToken = async (authToken: string) => {
  let resData;
  // Use new auth token to get access token
  // Since it contains a secret that cant be exposed on FE we have to make the request server-side
  try {
    const authRes = await fetch(
      `http://localhost:5000/api/auth?token=${authToken}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!authRes.ok) console.error("Could not get auth data");

    const authData = await authRes.json();
    const { token } = authData;
    const expiresTime = new Date(new Date().getTime() + token.expires_in);
    Cookies.set("linkedin-access-token", token.access_token, {
      expires: expiresTime,
    });

    const refreshExpiresTime = new Date(
      new Date().getTime() + token.refresh_token_expires_in
    );
    Cookies.set("linkedin-refresh-token", token.refresh_token, {
      expires: refreshExpiresTime,
    });

    Cookies.set("profile-data", JSON.stringify(authData.profile_data));
    Cookies.set(
      "linkedin-organization-data",
      JSON.stringify(authData.organizations)
    );

    resData = authData;
  } catch (error) {
    console.error(error);
  }
  return resData;
};
