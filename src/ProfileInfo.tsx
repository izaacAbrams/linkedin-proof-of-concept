type IProfileProps = {
  profileData?: Record<string, unknown>
}

export const ProfileInfo = ({profileData}: IProfileProps) => {
  console.log(profileData)
  if (!profileData) return <></>
  const {display_name, image} = profileData
  return (
    <div className="profile-info">
      <img src={image as string} className='profile-pic' />
      <p>{display_name as string}</p>
    </div>
  )
}