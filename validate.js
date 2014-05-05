var request = require('request');
var qs      = require('querystring');

// [ADDED] load up the user model (5/3/14)
var User    = require('../app/models/user');

var validate = {

/*
	facebook: {

	},

	twitter: {

	},

	google: {

	},
*/

	igScore: 0,

	followerScore: function (followerCount) {
		if (followerCount > 5000) {
			validate.igScore += 2;
      if (user.instagram.followers > 20000) {
        validate.igScore += 2;
        if (user.instagram.followers > 50000) {
          validate.igScore += 2;
          if (user.instagram.followers > 100000) {
            validate.igScore += 2;
          }
        }
      }
		} else if (followerCount < 50) {
			validate.igScore -= 1;
			if (followerCount < 25) {
				validate.igScore -= 1;
			}
		}
	},

	followRatio: function (followedBy, follows) {
		var percentage = (follows / followedBy) * 100;
		console.log('followRatio percentage: '+percentage+'%');
		if (percentage < 5 === true) {
			validate.igScore -= 2;
			return true;
		} else {
			validate.igScore += 1; 
			return false;
		} 
	},

	mediaRatio: function (mediaCount, followedBy) {
		var percentage = (mediaCount / followedBy) * 100;
		console.log('mediaRatio percentage: '+percentage+'%');
		if (percentage < 5 === true) {
			validate.igScore -= 2;
			return true;
		} else {
			validate.igScore += 1;
			return false;
		} 
	},

	likesRatio: function (second, fourth, sixth, followedBy) {
		if (!second || !fourth || !sixth) {
			validate.igScore -= 2;
			return true;
		} else {
			var secondPC = (second / followedBy) * 100;
			var fourthPC = (fourth / followedBy) * 100;	
			var sixthPC = (sixth / followedBy) * 100;

			var average = (secondPC + fourthPC + sixthPC) / 3;
			console.log('likesRatio percentage average: '+average+'%');

			if (average < 5) {
				validate.igScore -= 2;
				return true;
			} else {
				validate.igScore += 1;
				return false;	
			}
		}
	},

	noBio: function (bio) {
		if (bio === "") {
			validate.igScore -= 1;
			return true;
		} else { 
			validate.igScore += 1;
			console.log('User bio: '+bio);
			return false; 
		}
	},

	noPhoto: function (photoURL) {
		if (photoURL === "http://images.ak.instagram.com/profiles/anonymousUser.jpg") {
			validate.igScore -= 1;
			return true;
		} else { 
			console.log('PhotoURL: '+photoURL);
			validate.igScore += 1;
			return false; 
		}
	},

	inactivity: function (createdTime) {
		var day = 86400;
		var now = new Date().getTime() / 1000;
		var difference = now - createdTime;
		var diffInDays = difference / day;
		console.log('Inactivity (# of days): '+diffInDays+' days');

		if (diffInDays > 30) {
			validate.igScore -= 2;
			return true;
		} else {
			validate.igScore += 2;
			return false;
		}
	},

	instagram: function (id, token, done) { // [REVISIT] Inkh says to do 'instagram: function (id, token, done) {' (5/4/14)

		process.nextTick(function() {

			User.findOne({ 'instagram.id' : id }, function(err, user) {
		    if (err)
		      return done(err);
		    if (user) {

					var followers = user.instagram.followers;
					var follows = user.instagram.follows;

					// [ADDED] followerScore detection (5/3/14)
					validate.followerScore(followers);

					// [ADDED] followRatio detection (5/2/14)
					if (validate.followRatio(followers, follows)) {
						user.instagram.followFlag = true;
					} else {
						user.instagram.followFlag = false;
					}

					// [ADDED] mediaRatio detection (5/2/14)
				  var mediaCount = user.instagram.mediaCount;
				  if (validate.mediaRatio(mediaCount, user.instagram.followers)) {
				    user.instagram.mediaFlag = true;
				  } else {
				    user.instagram.mediaFlag = false;
				  }

				  // [ADDED] noPhoto detection (5/1/14)
				  var photoURL = user.instagram.photoURL;
				  if (validate.noPhoto(photoURL)) {
				    user.instagram.photoDetect = false;
				  } else {
				    user.instagram.photoDetect = true;
				    user.instagram.photoURL = photoURL;
				  }

				  // [ADDED] noBio detection (5/1/14)
				  var bio = user.instagram.bio;
				  if (validate.noBio(bio)) {
				    user.instagram.bioDetect = false;
				  } else {
				    user.instagram.bioDetect = true;
				    user.instagram.bio = bio;
				  }

					// SECOND API REQUEST
					var url = 'https://api.instagram.com/v1/users/' +id+ '/media/recent';

				  var params = {
				    'count': '10',
				    'access_token': token
				  }

				  url += '?' + qs.stringify(params);

				  request.get({url:url, json:true}, function (err, req, res) {

				  	// [ADDED] 
				  	console.log(arguments);
				  	if (err) {
				  		throw err;
				  	}

				    // [ADDED] inactivity detection (5/1/14)
				    if (res.data[0]) { // [FIX] Count length of media first, returns error when no there is no data (5/5/14)
					    var recentMedia = res.data[0]['created_time'];

					    if (validate.inactivity(recentMedia)) {
					      user.instagram.inactive = true;
					    } else { 
					      user.instagram.inactive = false;
					    }

				  	} else { user.instagram.inactive = true; }
				  	
				    // [REVISIT] change everything else (5/4/14)
				    // var isTrue =

				    // [ADDED] likesRatio detection (5/1/14)
				    // [REVISIT] try and change line 200 to something like line 201 (5/4/14) <-- INKH
				    var secondLikes = res.data[1]['likes']['count'];
				    //var secondLikes = res.data[1].likes.count;

				    var fourthLikes = res.data[3]['likes']['count'];
				    var sixthLikes = res.data[5]['likes']['count'];

				    if (validate.likesRatio(secondLikes, fourthLikes, sixthLikes, user.instagram.followers)) {
				      user.instagram.likesFlag = true;
				    } else {
				      user.instagram.likesFlag = false;
				    }

				    if (!user.instagram.score) {
				    	user.instagram.score = validate.igScore;	
				    }

				    user.instagram.validated = true;

				    // [PLACED] Moved from below (4/29/14)
			      user.save(function(err, product) {
			      	console.log('Arguments: \n\t--', arguments);
			        if (err) {
			        	throw err;
			        }

			        console.log('Product: \n\t--', product, done);
			        return done(null, user);
			        //return;
			        //return user;
			      });
				  });
		    }		
		  });
		});
	}
}

module.exports = validate;
