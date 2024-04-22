type IProfileProps = {
  profileData?: Record<string, unknown>;
  onClick: () => void;
};

export const ProfileInfo = ({ profileData, onClick }: IProfileProps) => {
  if (!profileData) return <></>;
  const { display_name, image } = profileData;
  return (
    <div className="profile-info" onClick={onClick}>
      <img src={image as string} className="profile-pic" />
      <p>{display_name as string}</p>
    </div>
  );
};
