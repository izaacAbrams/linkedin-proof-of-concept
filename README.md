# LinkedIn Post Proof of Concept

In this proof of concept we are utilizing LinkedIn's API to authenticate a user through OAuth, get a list of the user's organizations that they have admin roles for, then allow to upload an image post on either the profile or organization page.

## Setup

Setup needed:

- Create an organization (or login to linkedin account with admin level to an organization)
- Create a [new app](https://www.linkedin.com/developers/apps/new) from dev dashboard
- Under 'products' request access to the 'Advertising API'
- Copy .example.env to .env
- Copy client id and secret to env vars

## Steps
  
  1. Kick it off with requesting an authorization token
    - This will start the OAuth process and prompt the user to allow our LinkedIn app to access and modify data
    - If we choose to change scopes down the line, it would just require user to reauthenticate but no further changes needed
  1. After user accepts auth, we will be redirected to the url we provide with a `code` param with the new auth token. We use the auth token to request an access token
    - This step will require us to provide our client_secret, which is not to be shared or exposed in the frontend request
  1. Get user info
    - Will provide id (needed later), as well as profile picture and name so we can display the user correctly
  1. Get user organizations (if posting to org)
  1. Initialize image post
    - This response will give us an upload url, which we can use to actually upload the image
    - The image post id will not change after image upload, so this could be async if needed
  1. Upload image to prev image post
  1. Create and upload post
    - Only able to create post with 'PUBLISHED' state, unfortunately. We can post as published and immediately update state to draft, etc, but will require a seperate call
