import { getAccessToken } from "./utils/getAccessToken";

type IAuthProps = {
  setAuthToken: (token: string) => void;
  setProfileData: (profile: Record<string, unknown>) => void;
  setOrgsData: (orgs: Record<string, unknown>[]) => void;
};
export const Auth = ({
  setAuthToken,
  setProfileData,
  setOrgsData,
}: IAuthProps) => {
  const serialize = function (obj: Record<string, string | string[]>) {
    const str = [];
    for (const p in obj)
      if (Object.prototype.hasOwnProperty.call(obj, p)) {
        if (Array.isArray(obj[p])) {
          const stringVal = (obj[p] as string[]).join(" ");
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(stringVal));
        } else {
          const value = obj[p] as string;
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(value));
        }
      }
    return str.join("&");
  };

  const params = {
    // Always has been, always gonna be 'code'
    response_type: "code",
    client_id: import.meta.env.VITE_CLIENT_ID,
    redirect_uri: import.meta.env.VITE_REDIRECT_URI,
    // This is to protect against CSRF and optional
    state: "super-random-but-consistent-string",
    scope: [
      "r_basicprofile",
      "w_member_social",
      "rw_organization_admin",
      "r_organization_admin",
      "w_organization_social",
    ],
  };

  const handleAuthClick = async () => {
    // Handles it inside popup, but could also redirect / redirect back if desired
    const popup = window.open(
      `https://www.linkedin.com/oauth/v2/authorization?${serialize(params)}`,
      "popup",
      "popup=true"
    );
    const checkPopup = setInterval(async () => {
      if (
        popup &&
        popup.window.location?.href.includes("http://localhost:5173/")
      ) {
        const paramString = popup.window.location.href.split("?")[1];
        const queryString = new URLSearchParams(paramString);
        const authToken = queryString.get("code");
        if (authToken) {
          const authData = await getAccessToken(authToken);
          setAuthToken(authData.token.access_token);
          setProfileData(authData.profile_data);
          setOrgsData(authData.organizations);
        }
        popup.close();
      }
      if (!popup || !popup.closed) return;
      clearInterval(checkPopup);
    }, 1000);
  };

  return <button onClick={handleAuthClick}>Log me In</button>;
};
