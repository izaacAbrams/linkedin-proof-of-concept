import Cookies from "js-cookie";

export const getTokenFromRefresh = async (authToken: string) => {
  let resData;

  try {
    const authRes = await fetch(
      `http://localhost:5000/api/refresh?refresh_token=${authToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (!authRes.ok) console.error("Could not get auth data");

    const authData = await authRes.json();
    const expiresTime = new Date(new Date().getTime() + authData.expires_in);

    Cookies.set("linkedin-access-token", authData.access_token, {
      expires: expiresTime,
    });

    const refreshExpiresTime = new Date(
      new Date().getTime() + authData.refresh_token_expires_in
    );
    Cookies.set("linkedin-refresh-token", authData.refresh_token, {
      expires: refreshExpiresTime,
    });

    resData = authData;
  } catch (error) {
    console.error(error);
  }
  return resData;
};
