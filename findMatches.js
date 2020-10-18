const admin = require("firebase-admin");
const serviceAccount = require("./c-students-b7a3d-c15e4628d95c.json");

const { analyzeEntities } = require("./nlp.js");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function matchAge(user1, user2) {
  var ageRating = Math.max(10 - Math.abs(user1.age - user2.age) * 2, 0);
  return ageRating;
}

// function to parse school:
// school rating setter
function matchSchool(user1, user2) {
  var schoolRating = 0;
  if (user1["school"] === user2["school"]) {
    schoolRating = 10;
  } else {
    schoolRating = 0;
  }
  return schoolRating;
}

// function to anaylze text of courses
//course rating setter
function matchCourse(user1, user2) {
  var courseRating = 0;
  let courses = user1.courses;
  for (let i = 0; i < courses.length; i++) {
    let courseName = courses[i];
    if (user2.courses.includes(courseName)) {
      courseRating += 2;
    }
  }
  return courseRating;
}

// function to analyze majors
// major rating setter
async function matchMajor(user1, user2) {
  var majorRating = 0;
  var majorUser1 = await analyzeEntities(user1["major"]);
  var stringCourses = majorUser1.toString().toLowerCase();
  var majorUser2 = user2["major"];
  for (var i = 0; i < user2.length; i++) {
    if (stringCourses.includes(majorUser2[i].name.toLowerCase())) {
      majorRating += 2;
    }
  }
  return majorRating;
}

async function matchClub(user1, user2) {
  var clubRating = 0;
  var clubsUser1 = await analyzeEntities(user1["clubs"]);
  var stringCourses = clubsUser1.toString().toLowerCase();
  var clubsUser2 = await analyzeEntities(user2["clubs"]);
  console.log(clubsUser2);
  for (var i = 0; i < clubsUser2.length; i++) {
    if (stringCourses.includes(clubsUser2[i].name.toLowerCase())) {
      clubRating += 2;
    }
  }
  return clubRating;
}

async function matchHometown(user1, user2) {
  var hometownRating = 0;
  var hometownUser1 = await analyzeEntities(user1["hometown"]);
  var stringHometown1 = hometownUser1.toString().toLowerCase();
  var hometownUser2 = await analyzeEntities(user2["hometown"]);
  for (var i = 0; i < hometownUser2.length; i++) {
    if (stringHometown1.includes(hometownUser2[i].name.toLowerCase())) {
      hometownRating += 1;
    }
  }
  return hometownRating;
}

async function calculateRatingsForUsers(user, otherUsers) {
  try {
    let allUsersData = [];
    otherUsers.forEach((otherUser) => {
      if (user.name === otherUser.name && user.phone === otherUser.phone) {
        return;
      }
      let data = otherUser.data();
      data.uid = otherUser.id;
      allUsersData.push(data);
    });
    let allUserRatings = [];
    await Promise.all(
      allUsersData.map(async (userToCompare) => {
        let rating = 0;
        const r1 = matchCourse(user, userToCompare) * 3;
        const r2 = matchAge(user, userToCompare);
        const r3 = matchSchool(user, userToCompare) * 5;
        const r4 = (await matchMajor(user, userToCompare)) * 3;
        const r6 = await matchClub(user, userToCompare);
        const r7 = await matchHometown(user, userToCompare);
        userToCompare.rating = (r1 + r2 + r3 + r4 + r6 + r7) / 14;

        allUserRatings.push(userToCompare);
      })
    );
    return allUserRatings;
  } catch (err) {
    console.error(err);
  }
}

exports.findMatches = async (req, res) => {
  const uid = req.body.uid;
  try {
    // Get current user
    const currentUser = await db.collection("users").doc(uid).get();
    if (!currentUser.exists)
      return res.status(400).send({ message: "Invalid user ID" });

    // Get all other users
    let allUsersSnapshot = await db.collection("users").get();

    const allUsers = await calculateRatingsForUsers(
      currentUser.data(),
      allUsersSnapshot
    );

    res.send(allUsers);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};
