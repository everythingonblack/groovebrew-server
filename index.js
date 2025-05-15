// server.js
const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const dotenv = require("dotenv");
const socketIo = require("socket.io");
const querystring = require("querystring");
const webpush = require("web-push");
const bcrypt = require("bcrypt");

const nodefetch = require('node-fetch'); // Use node-fetch for making HTTP requests


const moment = require("moment");

// Load environment variables once, based on NODE_ENV
dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.production" : ".env.development",
});

const app = express();

const corsOptions = {
  origin: [
    process.env.FRONTEND_URI,
    process.env.FRONTEND_PLAYER_URI,
    'http://localhost:3000',
    'http://localhost:3001',
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Add more methods as needed
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
};

// Use CORS middleware
app.use(cors(corsOptions));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URI,
        process.env.FRONTEND_TEST_URI,
        process.env.FRONTEND_PLAYER_URI,
        process.env.FRONTEND_PLAYER_TEST_URI,
        'http://localhost:3000',
        'http://localhost:3001',
      ];
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error('Not allowed by CORS')); // Block the request
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

module.exports = { io };

const subscriptionService = require("./services/subscriptionService");
const SpotifyService = require("./services/SpotifyService");
const userHelper = require("./services/userHelper");

const spotifyService = new SpotifyService();

const userRoutes = require("./routes/userRoutes");
const couponRoutes = require("./routes/couponRoutes");
const cafeRoutes = require("./routes/cafeRoutes");
const itemRoutes = require("./routes/itemRoutes");
const materialRoutes = require("./routes/materialRoutes");
const materialMutationRoutes = require("./routes/materialMutationRoutes");
const tableRoutes = require("./routes/tableRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const authController = require("./controllers/authController");

const { verifyToken } = require("./services/jwtHelper"); // Import the JWT helper


const { User, Cafe, Coupon } = require("./models");

app.use(express.json());

// Generate VAPID keys (do this once and store the keys securely)
const vapidKeys = webpush.generateVAPIDKeys();
webpush.setVapidDetails(
  "mailto:your-email@example.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Endpoint to serve the public VAPID key
app.get("/vapid-key", (req, res) => {
  console.log("getting key" + vapidKeys.publicKey);
  res.json({ publicVapidKey: vapidKeys.publicKey });
});

// Endpoint to store subscription
app.post("/subscribe", (req, res) => {
  const { subscription, token } = req.body;
  subscriptionService.addSubscription(subscription, token);
  console.log("subscribing" + subscription + " " + token);
  res.status(201).json({});
});



app.get('/image', async (req, res) => {
  const imageUrl = req.query.url;  // Get the image URL from query parameter

  if (!imageUrl) {
    return res.status(400).json({ error: 'No image URL provided.' });
  }

  try {
    // Fetch the image from the URL
    const response = await nodefetch(imageUrl);

    if (!response.ok) {
      // throw new Error('Failed to fetch the image');
    }

    // Set the content type from the fetched image's content type
    res.set('Content-Type', response.headers.get('Content-Type'));
    
    // Stream the image content directly to the client
    response.body.pipe(res);
  } catch (error) {
    console.error('Error fetching the image:', error);
    res.status(500).json({ error: 'Failed to fetch the image.' });
  }
});


function generateRandomString(length) {
  return Array.from({ length }, () => {
    const charCode = Math.floor(Math.random() * 62);
    if (charCode < 10) {
      return String.fromCharCode(charCode + 48); // 0-9
    } else if (charCode < 36) {
      return String.fromCharCode(charCode + 55); // A-Z
    } else {
      return String.fromCharCode(charCode + 61); // a-z
    }
  }).join("");
}

io.on("connection", async (socket) => {
  console.log("Client connected");

  socket.on("req_guestSide", () => {
    // Emit a code immediately upon connection
    const randomAuthCode = generateRandomString(11);
    console.log(randomAuthCode);
    userHelper.storeQRCode(socket.id, randomAuthCode); // Store QR code with socket ID using helper function
    socket.emit("res_guest_side", randomAuthCode);

    socket.on("disconnect", () => {
      console.log(`Client ${socket.id} disconnected`);
      // Delete QR code associated with this socket
      const qrCode = userHelper.deleteQRCodeBySocketId(socket.id);
      if (qrCode) {
        console.log(
          `Deleted QR code ${qrCode} associated with socket ${socket.id}`
        );
      }
    });
  });

  socket.on("read_qrCode", async ({ qrCode, token }) => {
    const qrCodeData = userHelper.getSocketIdAndShopIdByQRCode(qrCode);
    if (qrCodeData) {
      const socketId = qrCodeData.socketId;
      const decoded = verifyToken(token);
      console.log("socket" + socketId);
      if (decoded) {
        const user = await User.findByPk(decoded.userId);
        if (user && user.roleId == 2) {
          const sessionCode = generateRandomString(21);
          io.sockets.sockets.get(socketId).join(user.cafeId);
          io.to(socketId).emit("qrCode_hasRead", {
            authGuestCode: sessionCode,
            shopId: user.cafeId,
          });
          socket.emit("qrCode_readSuccess", { shopId: user.cafeId });

          // Create guest side session and store it
          const guestSideSession = [
            decoded.userId,
            socket.id,
            socketId,
            sessionCode,
            user.cafeId,
          ];
          userHelper.createGuestSideSession(guestSideSession);

          // Delete QR code from map after it's read
          userHelper.deleteQRCodeBySocketId(socketId);
          console.log(
            `Deleted QR code ${qrCode} after reading by client ${socketId}`
          );
        }
      }
    } else {
      console.log(`No socket found for QR code ${qrCode}`);
    }
  });

  socket.on("checkUserToken", async ({ token, shopId }) => {
    try {
      let cafe = null;
      let isExceededDeadline = false;
      if (shopId) {
        cafe = await Cafe.findOne({
          attributes: ['ownerId'], // Specify the ownerId attribute
          where: { cafeId: shopId } // Use cafeId to find the record
        });

        if (cafe) {
          // Fetch the latest coupon for the cafe's owner (user)
          const latestCoupon = await Coupon.findOne({
            where: { userId: cafe.ownerId }, // Find the coupon related to the cafe owner (userId)
            order: [['discountEndDate', 'DESC']], // Sort by discountEndDate to get the latest one
          });

          if (latestCoupon) {

            // Calculate the deadline based on discountPeriods
            const discountPeriods = latestCoupon.discountPeriods;
            console.log(discountPeriods)
            const deadlineInDays = discountPeriods * 3; // Each period is 3 days
            console.log(deadlineInDays)
            const calculatedEndDate = moment(latestCoupon.discountEndDate).add(deadlineInDays, 'days'); // Add deadline to the createdAt date

            // Get today's date
            const today = moment();

            // Check if the coupon's calculated deadline has passed
            if (today.isAfter(calculatedEndDate)) {
              console.log('The coupon has exceeded its deadline.');
              isExceededDeadline = true;
            } else {
              console.log('The coupon is still valid.');
            }

            console.log(`Latest coupon for this cafe owner:`);
            console.log(latestCoupon);
            console.log(`Calculated discountEndDate (based on discountPeriods): ${calculatedEndDate.format('YYYY-MM-DD')}`);
          } else {
            console.log('No coupon found for this cafe owner.');
          }
        } else {
          console.log('Cafe not found.');
        }
      }

      console.log(`trying to check token` + shopId);
      await authController.checkTokenSocket(socket, token, shopId, cafe?.ownerId); //im adding shopId, is for the owner to be clerk, because owner didnt have cafeId on db
      if (shopId == "") return;

      console.log(cafe)
      if (!cafe) {
        socket.emit("joined-failed"); // Inform client about failed join attempt
        return;
      }
      const isSpotifyNeedLogin =
        spotifyService.getRoomDeviceId(shopId) == null ? true : false;
      // Emit success message or perform any other actions
      socket.join(shopId);
      socket.emit("joined-room", { shopId, isSpotifyNeedLogin, isExceededDeadline });
      console.log("emit to " + shopId + isSpotifyNeedLogin);

      const queue = await spotifyService.getQueue(shopId);

      setTimeout(function () {
        socket.emit("updateQueue", { queue: queue || [], getRecommendedMusic: spotifyService.rooms[shopId]?.getRecommendedMusic });
      }, 5000);
    } catch {
      console.log("error" + shopId);
    }
  });

  socket.on("checkGuestSideToken", async (data) => {
    const { token } = data;

    // Check if token is present
    if (!token) {
      return socket.emit("checkGuestSideTokenRes", {
        status: 404,
        message: "token is required",
      });
    }

    // Verify guest side session
    const sessionData = await userHelper.updateSocketGuestSide(
      token,
      socket.id
    );

    // Check if sessionData is null (session not found or invalid)
    if (sessionData == null) {
      return socket.emit("checkGuestSideTokenRes", {
        status: 404,
        message: "Guest side session not found or invalid",
      });
    }

    // Session verified, handle further actions (e.g., login, set session, etc.)
    // Example: Set session or perform additional actions based on sessionData

    // Respond with success or additional data if needed
    if (sessionData != null) {
      socket.emit("checkGuestSideTokenRes", {
        status: 200,
        message: "Guest side session verified successfully",
        sessionData,
      });
    }
  });

  // socket.on("join-room", async (data) => {
  //   const { shopId, token } = data;

  //   const cafe = await Cafe.findByPk(shopId);
  //   if (!cafe) {
  //     socket.emit("joined-failed"); // Inform client about failed join attempt
  //     return;
  //   }

  //   const session = await Session.findOne({ where: { token, isValid: true } });

  //   let user = null;
  //   if (session) {
  //     user = await User.findByPk(session.userId);
  //   }

  //   // Join the socket to the specified room
  //   console.log(socket.id);
  //   console.log(shopId);
  //   console.log(token);
  //   socket.join(shopId);

  //   // Add user to the room
  //   // if (user) {
  //   //   spotifyService.addUserToRoom(shopId, user.userId, socket.id);
  //   // } else {
  //   //   spotifyService.addUserToRoom(shopId, "guest", socket.id);
  //   // }

  //   // Optionally, you can associate the socket with the user ID
  //   // For example, you can store the socket ID along with the user ID
  //   // in a mapping for later use
  //   const isSpotifyNeedLogin =
  //     spotifyService.getRoomDeviceId(shopId) == null ? true : false;
  //   // Emit success message or perform any other actions
  //   socket.emit("joined-room", { shopId, isSpotifyNeedLogin });
  //   console.log(spotifyService.getRoomDeviceId(shopId));
  // });

  // Add event listener for leaving the room
  socket.on("leave-room", async (data) => {
    const { shopId } = data;
    socket.leave(shopId);
    // spotifyService.removeUserBySocketId(socket.id); // Remove user from room based on socket ID
    console.log("Left room:", shopId);
  });

  socket.on('claimPlayer', async (data) => {
    const { token, shopId } = data;

    // Validate the token
    if (token == "null" || token == "") {
      // Emit the 'claimPlayerRes' event with error response
      return socket.emit('claimPlayerRes', { error: "Unauthenticated" });
    }

    // Decode and verify the token
    try {
      const decoded = verifyToken(token); // Decodes the token (throws error if invalid)
      const user = await User.findByPk(decoded.userId); // Assuming User is your Sequelize model
      const cafe = await Cafe.findByPk(shopId); // Assuming User is your Sequelize model

      // Check user role and shopId
      if (user.roleId !== 2 && user.cafeId !== shopId && user.userId != cafe.ownerId) {
        // Emit the 'claimPlayerRes' event with error response
        return socket.emit('claimPlayerRes', { error: "Unauthenticated" });
      }

      // Generate a new player token
      const randomValue = Math.random().toString(36).substring(2); // Converts random number to a base-36 string

      if (!spotifyService.rooms[shopId]) {
        spotifyService.rooms[shopId] = { playerToken: '' };
      }

      // Set the player token for the room
      spotifyService.rooms[shopId].playerToken = randomValue;
      if (spotifyService.rooms[shopId].playerSocket) {
        io.to(spotifyService.rooms[shopId].playerSocket).emit('claimPlayerRes', { error: "Unauthenticated" });
      }
      spotifyService.rooms[shopId].playerSocket = '';
      // Emit the 'claimPlayerRes' event with success response
      return socket.emit('claimPlayerRes', { url: process.env.FRONTEND_PLAYER_URI + `/${shopId}?token=` + randomValue });
    } catch (error) {
      console.error('Error handling claimPlayer:', error);
      // Emit the 'claimPlayerRes' event with error response
      return socket.emit('claimPlayerRes', { error: "Error processing the request" });
    }
  });

  socket.on('configPlayer', async (data) => {

    const { token, shopId, getRecommendedMusic } = data;

    // Validate the token
    if (token == "null" || token == "") {
      // Emit the 'configPlayer' event with error response
      return socket.emit('configPlayerRes', { error: "Unauthenticated" });
    }

    // Decode and verify the token
    try {
      const decoded = verifyToken(token); // Decodes the token (throws error if invalid)
      
      console.log(decoded)
      const user = await User.findByPk(decoded.userId); // Assuming User is your Sequelize model
      const cafe = await Cafe.findByPk(shopId); // Assuming User is your Sequelize model

      // Check user role and shopId
      if (user.roleId !== 2 && user.cafeId !== shopId && user.userId != cafe.ownerId) {
        // Emit the 'configPlayer' event with error response
        return socket.emit('configPlayerRes', { error: "Unauthenticated" });
      }

      // Parse existing configuration
      let welcomePageConfig = cafe.welcomePageConfig
        ? JSON.parse(cafe.welcomePageConfig) || {}
        : {};

      // Update configuration
      welcomePageConfig.getRecommendedMusic = getRecommendedMusic;

      cafe.welcomePageConfig = JSON.stringify(welcomePageConfig);

      await cafe.save();

      spotifyService.rooms[shopId].getRecommendedMusic = getRecommendedMusic;
      console.log(spotifyService.rooms[shopId])

      // Emit the 'configPlayer' event with success response

      socket.emit('configPlayerRes', { status: '200' });

      const queue = await spotifyService.getQueue(shopId);
      return io.to(shopId).emit("updateQueue", { queue, getRecommendedMusic: getRecommendedMusic });
    } catch (error) {
      console.error('Error handling claimPlayer:', error);
      // Emit the 'configPlayer' event with error response
      return socket.emit('configPlayerRes', { error: "Error processing the request" });
    }
  });

  socket.on('authenticate', async (data) => {
    const { token, shopId } = data;
    console.log('authenticating' + token + shopId)
    console.log(spotifyService.rooms[shopId])
    // Validate the token
    if (token == "null" || token == "" || spotifyService.rooms[shopId]?.playerToken != token) {
      // Emit the 'claimPlayerRes' event with error response
      return socket.emit('claimPlayerRes', { error: "Unauthenticated" });
    }

    // Decode and verify the token
    try {
      const cafe = await Cafe.findByPk(shopId); // Assuming User is your Sequelize model
      // Parse existing configuration
      let welcomePageConfig = cafe.welcomePageConfig
        ? JSON.parse(cafe.welcomePageConfig)
        : {};

      spotifyService.rooms[shopId].getRecommendedMusic = welcomePageConfig.getRecommendedMusic;

      spotifyService.rooms[shopId].playerSocket = socket.id;
      socket.join(shopId);
      socket.emit('authenticated');
      const queue = await spotifyService.getQueue(shopId);
      setTimeout(function () {
        socket.emit("updateQueue", { queue, getRecommendedMusic: spotifyService.rooms[shopId].getRecommendedMusic });
      }, 5000);
    } catch (error) {
      console.error('Error handling claimPlayer:', error);
      // Emit the 'claimPlayerRes' event with error response
      return socket.emit('claimPlayerRes', { error: "Error processing the request" });
    }
  });

  socket.on('unClaimPlayer', async (data) => {
    const { token, shopId } = data;

    // Validate the token
    if (token == "null" || token == "") {
      // Emit the 'unClaimPlayerRes' event with error response
      return socket.emit('unClaimPlayerRes', { error: "Unauthenticated" });
    }

    // Decode and verify the token
    try {
      const decoded = verifyToken(token); // Decodes the token (throws error if invalid)
      const user = await User.findByPk(decoded.userId); // Assuming User is your Sequelize model

      // Check user role and shopId
      if (user.roleId !== 2 && user.cafeId !== shopId) {
        // Emit the 'unClaimPlayerRes' event with error response
        return socket.emit('unClaimPlayerRes', { error: "Unauthenticated" });
      }

      if (!spotifyService.rooms[shopId]) {
        spotifyService.rooms[shopId] = { playerToken: '' };
      }

      // Set the player token for the room
      spotifyService.rooms[shopId].playerToken = '';

      // Emit the 'unClaimPlayerRes' event with success response
      return socket.emit('unClaimPlayerRes', { message: 'Player unclaimed successfully' });
    } catch (error) {
      console.error('Error handling unClaimPlayer:', error);
      // Emit the 'unClaimPlayerRes' event with error response
      return socket.emit('unClaimPlayerRes', { error: "Error processing the request" });
    }
  });

  socket.on('editQueue', async (data) => {
    const { token, shopId, editedQueue } = data;
    console.log('authenticating' + editedQueue)
    console.log(shopId)
    console.log(spotifyService.rooms[shopId])
    // Validate the token
    if (token == "null" || token == "" || spotifyService.rooms[shopId]?.playerToken != token) {
      // Emit the 'claimPlayerRes' event with error response
      // return socket.emit('editQueueRes', { error: "Unauthenticated" });
      return;
    }

    // Decode and verify the token
    try {
      spotifyService.rooms[shopId].queue = editedQueue;
      io.to(shopId).emit("updateQueue", { queue: editedQueue, getRecommendedMusic: spotifyService.rooms[shopId].getRecommendedMusic });
    } catch (error) {
      console.error('Error handling claimPlayer:', error);
      // Emit the 'claimPlayerRes' event with error response
      // return socket.emit('claimPlayerRes', { error: "Error processing the request" });
    }
  });

  socket.on('updateCurrentTrack', async (data) => {
    const { token, shopId, currentTrack } = data;
    console.log('authenticating' + currentTrack)
    console.log(shopId)
    console.log(spotifyService.rooms[shopId])
    // Validate the token
    if (token == "null" || token == "" || spotifyService.rooms[shopId]?.playerToken != token) {
      // Emit the 'claimPlayerRes' event with error response
      // return socket.emit('editQueueRes', { error: "Unauthenticated" });
      return;
    }

    // Decode and verify the token
    try {
      spotifyService.rooms[shopId].currentTrack = currentTrack;
      io.to(shopId).emit("updateCurrentSong", currentTrack);
    } catch (error) {
      console.error('Error handling claimPlayer:', error);
      // Emit the 'claimPlayerRes' event with error response
      // return socket.emit('claimPlayerRes', { error: "Error processing the request" });
    }
  });
  socket.on("searchRequest", async (data) => {
    const { songName } = data;
    console.log("Searching for track:", songName);
    const tracks = await spotifyService.searchSongs(songName);

    console.log(tracks)
    if (tracks.length > 0) {
      socket.emit('searchResponse', tracks);
    } else {
      socket.emit('searchResponse', []);
    }
  });
  
async function checkTrack(trackData, filter) {
  // Gabungkan trackData dan filter ke dalam prompt
  const prompt = `
    Saya akan memberikan data lagu dan filter, tolong periksa apakah lagu tersebut lolos filter.
    Data lagu: 
    Nama: ${trackData.name}, 
    Artist: ${trackData.artist}, 
    Durasi: ${trackData.length}, 
    Track ID: ${trackData.trackId}
    Filter: ${filter}

    Jawab hanya dengan {success: boolean, alasan: text}.
    berikan alasan hanya dengan raw text.
    alasan tidak lebih dari 13 kata.
    Jika lagu lolos filter maka return true, jika tidak, return false.
    Jika tidak lolos filter, sertakan alasan dengan format: "kafe ini tidak dapat memutar (alasan yang terfilter)".
  `;

  const apiKey = 'AIzaSyAUMuISZEx_dwGak0rA0CxyJ1HUNUUNfEg'; // Ganti dengan API Key Gemini Anda
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt // Mengirimkan prompt yang sudah digabungkan dengan trackData dan filter
          }
        ]
      }
    ]
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    console.log(JSON.stringify(data))
    // Ambil teks hasil jawaban dari model
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Bersihkan string markdown ```json ... ```
    const cleaned = rawText.replace(/```json|```/g, '').trim();

    // Parse ke JSON
    const result = JSON.parse(cleaned);

    console.log('Success:', result.success);
    console.log('Alasan:', result.alasan);
    return result;
  } catch (error) {
    console.error('Error:', error);
    return {success: false}
  }
}

  socket.on("songRequest", async (data) => {
    const { token, shopId, track } = data;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findByPk(decoded.userId);
        const cafe = await Cafe.findOne({
          attributes: ['welcomePageConfig'], // Specify the ownerId attribute
          where: { cafeId: shopId } // Use cafeId to find the record
        });

        let welcomePageConfig = cafe.welcomePageConfig
          ? JSON.parse(cafe.welcomePageConfig) || {}
          : {};
        
        if(welcomePageConfig.musicFilter != ''){
          const filterwithAI = await checkTrack(track, welcomePageConfig.musicFilter)
          
          socket.emit('requestResponse', filterwithAI);
          if(!filterwithAI.success) return;
        }

        console.log("AAAAAAAA")
        if (user) {
          spotifyService.addToQueue(shopId, user.userId, track);

          const queue = await spotifyService.getQueue(shopId);
          console.log("sharing queue" + track);
          console.log(queue)
          io.to(shopId).emit("updateQueue", { queue });
          console.log(shopId);
          console.log(queue);
        }
      }
    }
  });

  socket.on("songVote", async (data) => {
    const { token, shopId, trackId, vote } = data;

    const decoded = verifyToken(token);
    if (decoded) {
      const user = await User.findByPk(decoded.userId);
      if (user) {
        spotifyService.voteForSong(shopId, user.userId, trackId, vote);

        const queue = await spotifyService.getQueue(shopId);
        console.log(queue)
        io.to(shopId).emit("updateQueue", { queue });
      }
    }
  });

  socket.on("playOrPause", async (data) => {
    const { token, shopId, action } = data;

    const decoded = verifyToken(token);
    if (decoded) {
      const user = await User.findByPk(decoded.userId);
      if (user.roleId == 2 && user.cafeId == shopId) {
        const player = await spotifyService.playOrPauseSpotify(shopId, action);
        if (player) {
          io.to(shopId).emit("updatePlayer", action);
        }
      }
    }
  });
  socket.on("getRecommendation", async (data) => {
    const { token, shopId, currentTrack } = data;

    console.log('getting recommendation', currentTrack)
    console.log(shopId)
    console.log(spotifyService.rooms[shopId])
    // Validate the token
    if (token == "null" || token == "" || spotifyService.rooms[shopId]?.playerToken != token) {
      // Emit the 'claimPlayerRes' event with error response
      // return socket.emit('editQueueRes', { error: "Unauthenticated" });
      return;
    }


    const recommended = await fetch("https://music.youtube.com/youtubei/v1/next?prettyPrint=false", {
      headers: {
        "accept": "*/*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "same-origin",
        "sec-fetch-site": "same-origin",
        "x-goog-visitor-id": "<your-visitor-id>",
        "x-youtube-client-name": "67",
        "x-youtube-client-version": "1.20241218.01.00"
      },
      referrer: "https://music.youtube.com/watch?v=" + currentTrack,
      referrerPolicy: "strict-origin-when-cross-origin",
      body: JSON.stringify({
        enablePersistentPlaylistPanel: true,
        tunerSettingValue: "AUTOMIX_SETTING_NORMAL",
        playlistId: "RDAMVM" + currentTrack,
        params: "wAEB8gECeAHqBAtEaVRkNzcxV3VtRQ%3D%3D",
        isAudioOnly: true,
        responsiveSignals: {
          videoInteraction: [
            {
              queueImpress: {},
              videoId: currentTrack,
              queueIndex: 0
            }
          ]
        },
        queueContextParams: "CAEaEVJEQU1WTURpVGQ3NzFXdW1FIITB5uvG44oDMgtEaVRkNzcxV3VtRUoLRGlUZDc3MVd1bUVQAFoECAAQAQ==",
        context: {
          client: {
            hl: "en",
            gl: "ID",
            remoteHost: "182.253.116.34",
            deviceMake: "Apple",
            deviceModel: "iPhone",
            userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1,gzip(gfe)",
            clientName: "WEB_REMIX",
            clientVersion: "1.20241218.01.00",
            osName: "iPhone",
            osVersion: "16_6",
            originalUrl: "https://music.youtube.com/watch?v=" + currentTrack,
            screenPixelDensity: 1,
            platform: "MOBILE",
            clientFormFactor: "UNKNOWN_FORM_FACTOR",
            configInfo: {
              appInstallData: "<app-install-data>"
            }
          },
          user: {
            lockedSafetyMode: false
          }
        },
        request: {
          useSsl: true,
          consistencyTokenJars: [
            {
              encryptedTokenJarContents: "<your-encrypted-token-contents>"
            }
          ],
          internalExperimentFlags: []
        },
        clickTracking: {
          clickTrackingParams: "CBoQ_20iEwiRpeXrxuOKAxUiv0sFHawvFXc="
        },
        adSignalsInfo: {
          params: [
            { key: "dt", value: "1736250955353" },
            { key: "flash", value: "0" },
            { key: "frm", value: "0" },
            { key: "u_tz", value: "420" },
            { key: "u_his", value: "5" },
            { key: "u_h", value: "1080" },
            { key: "u_w", value: "1920" },
            { key: "u_ah", value: "1032" },
            { key: "u_aw", value: "1920" },
            { key: "u_cd", value: "24" },
            { key: "bc", value: "31" },
            { key: "bih", value: "944" },
            { key: "biw", value: "963" },
            { key: "brdim", value: "3,10,3,10,1920,0,1275,1039,963,944" },
            { key: "vis", value: "1" },
            { key: "wgl", value: "true" },
            { key: "ca_type", value: "image" }
          ]
        }
      }),
      method: "POST",
      mode: "cors",
      credentials: "include"
    })
      .then(response => response.json())
      .then(data => { return data })
      .catch(error => console.error("Error:", error));
    const randomNumber = Math.floor(Math.random() * 4);  // Generates a random number between 0 and 3

    io.to(shopId).emit("updateRecommendation", recommended?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer?.contents[randomNumber]);



  });
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    // spotifyService.removeUserBySocketId(socket.id); // Remove user from room based on socket ID
  });
});

app.post("/getConnectedGuestsSides", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  console.log("tok" + token);
  // Check if token is present
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  const decoded = verifyToken(token);

  const user = await User.findByPk(decoded.userId);
  if (!user || (user.roleId != undefined && user.roleId != 2)) {
    return res.redirect(process.env.FRONTEND_URI);
  }

  // Verify guest side session
  const sessionDatas = userHelper.getSessionsByClerkId(decoded.userId);
  console.log("list" + sessionDatas);

  // Check if sessionData is null (session not found or invalid)
  if (sessionDatas.length < 1) {
    return res
      .status(404)
      .json({ error: "Guest side session not found or invalid" });
  }

  // Session verified, handle further actions (e.g., login, set session, etc.)
  // Example: Set session or perform additional actions based on sessionData

  // Respond with success or additional data if needed
  res
    .status(200)
    .json({ message: "getting Guest side session successfully", sessionDatas });
});

app.post("/removeConnectedGuestsSides", async (req, res) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  console.log("tok" + token);
  // Check if token is present
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  const decoded = verifyToken(token);
  const user = await User.findByPk(decoded.userId);
  if (user.roleId != 2) {
    return res.redirect(process.env.FRONTEND_URI);
  }

  const rm = userHelper.deleteGuestSideSessionByGuestSideSessionId(
    decoded.userId,
    req.body.guestSideSessionId
  );
  if (!rm)
    return res.status(404).json({ error: "side session not found or invalid" });

  try {
    io.sockets.sockets
      .get(rm.previousGuestSideSocket)
      .emit("signout-guest-session");
    res.status(200).json({
      message: "removing Guest side session successfully",
      guestSideList: rm.guestSideList,
    });
  } catch { }
});

//interval for guest side
setInterval(async () => {
  Object.keys(userHelper.qrCodeSocketMap).forEach((socketId) => {
    const randomAuthCode = generateRandomString(11);
    userHelper.storeQRCode(socketId, randomAuthCode); // Update QR code with new value and shopId
    io.to(socketId).emit("res_guest_side", randomAuthCode); // Emit new QR code to client
  });
}, 20000);

// // Periodically check the playback status and play the next song if needed
// setInterval(async () => {
//   for (const shopId in spotifyService.rooms) {
//     const room = spotifyService.rooms[shopId];
//     const playbackState = await spotifyService.getCurrentPlaybackState(shopId);

//     if (!spotifyService.rooms[shopId].paused) {
//       if (
//         playbackState &&
//         !playbackState.is_playing &&
//         playbackState.currently_playing_type === "track"
//       ) {
//         await spotifyService.playInSpotify(shopId);
//         const queue = await spotifyService.getQueue(shopId);
//         io.to(shopId).emit("updateQueue", queue);
//       } else if (playbackState) {
//         const queueItems = spotifyService.rooms[shopId].queue || [];

//         if (playbackState.item && playbackState.item.duration_ms) {
//           const remainingTime =
//             playbackState.item.duration_ms - playbackState.progress_ms;
//           if (
//             remainingTime <= 40000 &&
//             remainingTime > 12000 &&
//             spotifyService.rooms[shopId].nextTrack === ""
//           ) {
//             // Use a while loop to handle removals and continue iterating correctly

//             const subscriptionStatus =
//               await spotifyService.getUserSubscriptionStatus(shopId);

//             if (subscriptionStatus == "premium")
//               spotifyService.rooms[shopId].disableRequest = false;

//             let index = 0;
//             while (
//               index < queueItems.length &&
//               spotifyService.rooms[shopId].nextTrack === ""
//             ) {
//               const item = queueItems[index];
//               if (item[1].length < item[2].length) {
//                 spotifyService.rooms[shopId].queue[index][3] = true;
//                 spotifyService.rooms[shopId].queue[index][4] = false; //false means will not be played, for frontend

//                 if (subscriptionStatus !== "premium") {
//                   spotifyService.rooms[shopId].queue[index][4] = false; //false means will not be played, for frontend
//                   spotifyService.rooms[shopId].disableRequest = true;
//                 }

//                 console.log(spotifyService.rooms[shopId].queue[index]);
//                 index++;
//                 continue;
//               } else {
//                 // If 20 seconds or less remaining, set the next track to be played
//                 spotifyService.rooms[shopId].queue[index][3] = true;
//                 spotifyService.rooms[shopId].queue[index][4] = true; //true means will be played, for frontend

//                 if (subscriptionStatus !== "premium") {
//                   spotifyService.rooms[shopId].queue[index][4] = false; //false means will not be played, for frontend
//                   spotifyService.rooms[shopId].disableRequest = true;

//                   index++;
//                   continue;
//                 }

//                 spotifyService.rooms[shopId].nextTrack = item[0];
//                 console.log("set " + spotifyService.rooms[shopId].nextTrack);

//                 console.log(spotifyService.rooms[shopId].queue[index]);
//               }
//             }
//           }

//           if (remainingTime <= 12000) {
//             // If 10 seconds or less remaining and next track is set, add it to Spotify queue
//             await spotifyService.playNextInQueue(
//               shopId,
//               spotifyService.rooms[shopId].nextTrack
//             );
//             spotifyService.rooms[shopId].nextTrack = "";
//           }
//         } else {
//           console.log(
//             "No track is currently playing or duration information is not available."
//           );
//         }
//       }
//     }

//     if (playbackState?.is_playing) {
//       io.to(shopId).emit("updateCurrentSong", playbackState);

//       let canvas = spotifyService.rooms[shopId].canvas;
//       let lyrics = spotifyService.rooms[shopId].lyrics;

//       if (spotifyService.rooms[shopId].oldTrack != playbackState.item.id) {
//         try {
//           canvas = await spotifyService.getCanvasUrl(playbackState.item.id);
//           spotifyService.rooms[shopId].canvas = canvas;

//         } catch (error) {
//           console.error("Error fetching canvas URL:", error);
//           spotifyService.rooms[shopId].canvas = ""
//         }
//         try {
//           lyrics = await spotifyService.fetchRandomTrackLyrics(
//             shopId,
//             playbackState.item.id,
//             true
//           );
//           spotifyService.rooms[shopId].lyrics = lyrics;
//         } catch (error) {
//           spotifyService.rooms[shopId].lyrics = null;
//         }

//         spotifyService.rooms[shopId].oldTrack = playbackState.item.id;
//       }

//       io.to(shopId).emit("updateCanvas", canvas);
//       io.to(shopId).emit("updateLyrics", lyrics.lines || []);
//     }

//     const queue = await spotifyService.getQueue(shopId);
//     io.to(shopId).emit("updateQueue", queue);

//     if (room.refreshTimeRemaining > 0) {
//       room.refreshTimeRemaining -= 8000; // Decrease by 8000 ms (your interval)
//     } else {
//       try {
//         await spotifyService.refreshAccessToken(shopId);
//         console.log("refreshing " + shopId);
//       } catch (error) {
//         console.error(
//           `Failed to refresh token for room ${shopId}: ${error.message}`
//         );
//       }
//     }
//   }

//   console.log("tick");
// }, 8000);

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // Serve static files from the React app
// app.use(express.static(path.join(__dirname, '../frontend/build')));

// app.get('/api', (req, res) => {
//     res.send('Hello from the backend!');
// });

// // Handles any requests that don't match the ones above
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
// });

app.use("/user", userRoutes);
app.use("/coupon", couponRoutes);
app.use("/cafe", cafeRoutes);
app.use("/item", itemRoutes);
app.use("/material", materialRoutes);
app.use("/mutation", materialMutationRoutes);
app.use("/table", tableRoutes);
app.use("/transaction", transactionRoutes);

const cron = require("node-cron");
const {
  createReportForAllCafes,
  generateReport
} = require("./controllers/transactionController");

const {deleteItemsMarkedForDeletion} = require("./controllers/itemController");

// Schedule a task to run every day at midnight
// cron.schedule("04 07 * * *", async () => {
//   console.log("Running daily report generation for all cafes...");
//   await createReportForAllCafes();
// });


// Function to create a manipulated UTC date
const getUtc = () => {
  // Set the UTC time you want, for example: 2024-12-29T17:00:00Z
  // const utc = moment.utc('2025-01-05T17:00:00Z');
  const utc = moment.utc();


  // Return the manipulated UTC time
  return utc;
};

// Cron job running every minute to check for simulated midnight
const cronExpression = '0 * * * *';

cron.schedule(cronExpression, async () => {
  try {
    // Get all cafes
    const cafes = await Cafe.findAll();

    // Loop through each cafe to check if it's their simulated midnight in local time
    for (let cafe of cafes) {
      const cafeTimezone = cafe.timezone || 'Asia/Jakarta'; // Default to 'Asia/Jakarta' if no timezone set

      // Get the manipulated UTC time
      const manipulatedUTC = getUtc();

      // Convert manipulated UTC time to the cafe's local time
      const localTime = manipulatedUTC.clone().tz(cafeTimezone);

      // Log the local time for debugging purposes
      console.log(`Local time for ${cafe.name} (${cafeTimezone}): ${localTime.format()}`);

      // Check if it's midnight (00:00) in the cafe's local timezone
      const isMidnight = localTime.hour() === 0 && localTime.minute() >= 0 && localTime.minute() < 45;

      console.log(isMidnight);  // This will now log true when it's midnight (00:00) in local time

      if (isMidnight) {
        // Generate the daily report for this cafe at manipulated UTC time
        await generateReport(cafe.cafeId, localTime, cafeTimezone);
        console.log(`Daily report generated for cafe ${cafe.name} at manipulated UTC time ${manipulatedUTC.format()}`);
        await deleteItemsMarkedForDeletion(cafe.cafeId);

      }
    }
  } catch (error) {
    console.error('Error during cron job execution:', error);
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
