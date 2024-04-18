import React from "react";
import Cookies from "js-cookie";
import { Auth } from "./Auth";
import "./App.css";
import { ProfileInfo } from "./ProfileInfo";

function App() {
  const profileCookie = Cookies.get("profile-data");
  const organizationCookie = Cookies.get("organization-data");
  const parsedProfile = profileCookie ? JSON.parse(profileCookie) : undefined;
  const parsedOrgs = organizationCookie
    ? JSON.parse(organizationCookie)
    : undefined;
  const [profileData, setProfileData] =
    React.useState<Record<string, unknown>>(parsedProfile);
  const [organizations, setOrganizationsData] =
    React.useState<Record<string, unknown>>(parsedOrgs);
  const [postMode, setPostMode] = React.useState<"personal" | "org">(
    "personal"
  );
  const [token, setToken] = React.useState(
    Cookies.get("linkedin-access-token")
  );
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
  console.log(organizations);
  const handleCreatePost = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const imageDataUrl = canvas.toDataURL("image/png");
    const base64Data = imageDataUrl.replace(
      /^data:image\/(png|jpg|jpeg);base64,/,
      ""
    );
    console.log(profileData);
    try {
      const response = await fetch(
        `http://localhost:5000/api/create?token=${token}&user_id=${profileData.id}&title=Some custom text`,
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

  return (
    <>
      <h1>LinkedIn Post Maker or Something</h1>
      <div className="post-section">
        {!token && (
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
                className={`post-method ${
                  postMode === "personal" && "method-active"
                }`}
              >
                Post as Myself
              </h3>
              <h3
                className={`post-method ${
                  postMode === "org" && "method-active"
                }`}
              >
                Post as an Org
              </h3>
            </div>
            <ProfileInfo profileData={profileData} />
            {organizations &&
              Object.keys(organizations.results as Record<string, unknown>).map(
                (key) => {
                  const org = organizations.results[key];
                  return (
                    <div>
                      <p>{org.localizedName}</p>
                    </div>
                  );
                }
              )}
            <button onClick={handleCreatePost}>Create Post</button>
            <h3>Canvas to upload:</h3>
            <canvas className="canvas-image" ref={canvasRef}></canvas>
          </>
        )}
      </div>
    </>
  );
}

export default App;
