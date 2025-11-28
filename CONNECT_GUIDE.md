CONNECT_GUIDE.md (full guide)
1) Convert Instagram to Professional (Business)

Open Instagram app → Profile → Menu → Settings and Privacy → Account type and tools → Switch to Professional Account → Business.

2) Connect IG to Facebook Page (methods)

From Instagram: Profile → Edit Profile → Public business information → Page → select your Page.

From Facebook Page: Facebook → Page → Professional Dashboard → Linked Accounts / Instagram → Connect Account → Login to IG and confirm.

3) Check links

Instagram: Settings & Privacy → Accounts Center — shows connected Facebook profile and Page.

Facebook Page: Page Settings → Linked Accounts → Instagram.

4) Cross-posting

From Instagram post composer enable "Share to Facebook". On Facebook Page, enable auto share where available.

5) Permissions & API flow for your site (developer summary)

Required permissions for the app:

instagram_basic

instagram_content_publish

pages_show_list

pages_manage_posts

(optional) pages_read_engagement

OAuth scopes to request on login:

pages_show_list pages_manage_posts instagram_basic instagram_content_publish

Typical API steps (after user grants permission):

GET /me/accounts?access_token=USER_TOKEN — get pages managed by user.

GET /{page_id}?fields=instagram_business_account — get IG Business Account ID.

Use Page access token and IG Business Account ID to publish to both platforms.

Sample endpoint to check IG link:

GET /{page_id}?fields=instagram_business_account

If instagram_business_account is null → not linked.











## -----------------------------------------------------------optinal ------->>>>>>>>>>>>>>>>>>>>>>>>
CONNECT_GUIDE.md (full guide)
1) Convert Instagram to Professional (Business)

Open Instagram app → Profile → Menu → Settings and Privacy → Account type and tools → Switch to Professional Account → Business.

2) Connect IG to Facebook Page (methods)

From Instagram: Profile → Edit Profile → Public business information → Page → select your Page.

From Facebook Page: Facebook → Page → Professional Dashboard → Linked Accounts / Instagram → Connect Account → Login to IG and confirm.

3) Check links

Instagram: Settings & Privacy → Accounts Center — shows connected Facebook profile and Page.

Facebook Page: Page Settings → Linked Accounts → Instagram.

4) Cross-posting

From Instagram post composer enable "Share to Facebook". On Facebook Page, enable auto share where available.

5) Permissions & API flow for your site (developer summary)

Required permissions for the app:

instagram_basic

instagram_content_publish

pages_show_list

pages_manage_posts

(optional) pages_read_engagement

OAuth scopes to request on login:

pages_show_list pages_manage_posts instagram_basic instagram_content_publish

Typical API steps (after user grants permission):

GET /me/accounts?access_token=USER_TOKEN — get pages managed by user.

GET /{page_id}?fields=instagram_business_account — get IG Business Account ID.

Use Page access token and IG Business Account ID to publish to both platforms.