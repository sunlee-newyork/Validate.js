Validate.js
===========

Social account validation system (currently for Instagram only)
Measures user's account from 0 to 15 in areas of followers, follows, media count, average amount of likes, recent activity, etc.

Module built for express.js:
- Collects initial data from MongoDB
- Makes second API request for media/recent endpoints
- Customized scoring for each area of social presence
