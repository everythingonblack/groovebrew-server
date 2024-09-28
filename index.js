const express = require("express");
const cors = require("cors");
const http = require("http");
const path = require("path");
const dotenv = require("dotenv");
const socketIo = require("socket.io");
const querystring = require("querystring");
const webpush = require("web-push");
dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URI,
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
const cafeRoutes = require("./routes/cafeRoutes");
const itemRoutes = require("./routes/itemRoutes");
const materialRoutes = require("./routes/materialRoutes");
const materialMutationRoutes = require("./routes/materialMutationRoutes");
const tableRoutes = require("./routes/tableRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const authController = require("./controllers/authController");

const { User, Cafe, Session } = require("./models");

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
      const session = await Session.findOne({
        where: { token, isValid: true },
      });
      console.log("socket" + socketId);
      if (session) {
        const user = await User.findByPk(session.userId);
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
            session.userId,
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
      console.log(`trying to check token`);
      await authController.checkTokenSocket(socket, token);
      if (shopId == "") return;

      const cafe = await Cafe.findByPk(shopId);
      if (!cafe) {
        socket.emit("joined-failed"); // Inform client about failed join attempt
        return;
      }

      const isSpotifyNeedLogin =
        spotifyService.getRoomDeviceId(shopId) == null ? true : false;
      // Emit success message or perform any other actions
      socket.emit("joined-room", { shopId, isSpotifyNeedLogin });
      console.log("emit to " + shopId + isSpotifyNeedLogin);
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
    spotifyService.removeUserBySocketId(socket.id); // Remove user from room based on socket ID
    console.log("Left room:", shopId);
  });

  socket.on("searchRequest", async (data) => {
    const { shopId, songName } = data;

    const songs = await spotifyService.searchSongs(shopId, songName);
    socket.emit("searchResponse", songs);
    console.log(songs);
  });

  socket.on("songRequest", async (data) => {
    const { token, shopId, trackId } = data;
    if (token) {
      const session = await Session.findOne({
        where: { token, isValid: true },
      });
      if (session) {
        const user = await User.findByPk(session.userId);
        if (user) {
          spotifyService.addToQueue(shopId, user.userId, trackId);

          const queue = await spotifyService.getQueue(shopId);
          io.to(shopId).emit("updateQueue", queue);
          console.log(shopId);
          console.log(queue);
        }
      }
    }
  });

  socket.on("songVote", async (data) => {
    const { token, shopId, trackId, vote } = data;

    const session = await Session.findOne({ where: { token, isValid: true } });
    if (session) {
      const user = await User.findByPk(session.userId);
      if (user) {
        spotifyService.voteForSong(shopId, user.userId, trackId, vote);

        const queue = await spotifyService.getQueue(shopId);
        io.to(shopId).emit("updateQueue", queue);
      }
    }
  });

  socket.on("playOrPause", async (data) => {
    const { token, shopId, action } = data;

    const session = await Session.findOne({ where: { token, isValid: true } });
    if (session) {
      const user = await User.findByPk(session.userId);
      if (user.roleId == 2 && user.cafeId == shopId) {
        const player = await spotifyService.playOrPauseSpotify(shopId, action);
        if (player) {
          io.to(shopId).emit("updatePlayer", action);
        }
      }
    }
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

  const session = await Session.findOne({ where: { token, isValid: true } });
  const user = await User.findByPk(session.userId);
  if (user.roleId != 2) {
    return res.redirect(process.env.FRONTEND_URI);
  }

  // Verify guest side session
  const sessionDatas = userHelper.getSessionsByClerkId(session.userId);
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

  const session = await Session.findOne({ where: { token, isValid: true } });
  const user = await User.findByPk(session.userId);
  if (user.roleId != 2) {
    return res.redirect(process.env.FRONTEND_URI);
  }

  const rm = userHelper.deleteGuestSideSessionByGuestSideSessionId(
    session.userId,
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
  } catch {}
});

//spotify login endpoint, for clerk
app.get("/login", async (req, res) => {
  const token = req.query.token;
  const shopId = req.query.cafeId;
  console.log(token, shopId);
  if (token == "null" || token == "") {
    return res.redirect(process.env.FRONTEND_URI);
  }

  const session = await Session.findOne({ where: { token, isValid: true } });
  const user = await User.findByPk(session.userId);
  if (user.roleId != 2 && user.cafeId != shopId) {
    return res.redirect(process.env.FRONTEND_URI);
  }

  const scope =
    "user-read-private user-read-playback-state user-modify-playback-state";

  // Construct the authorization URL with the shopId as a query parameter
  const authorizationUrl =
    "https://accounts.spotify.com/authorize?" +
    querystring.stringify({
      response_type: "code",
      client_id: process.env.SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
      state: shopId, // Include the shopId as the state parameter
    });

  // Redirect the user to the Spotify authorization page
  res.redirect(authorizationUrl);
});

//callback from spotify login, from spotify api
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  const shopId = req.query.state;

  const access_token = await spotifyService.getDeviceAccessToken(code, shopId);
  await spotifyService.getDeviceId(access_token, shopId);
  await spotifyService.transferPlayback(shopId);

  console.log("aacc" + spotifyService.getRoomDeviceId(shopId));
  res.redirect(`${process.env.FRONTEND_URI}/${shopId}`);
});

//spotify logout endpoint, for clerk
app.get("/logout", async (req, res) => {
  const token = req.query.token;
  const shopId = req.query.cafeId;
  if (token == "null" || token == "") {
    return res.redirect(process.env.FRONTEND_URI);
  }

  const session = await Session.findOne({ where: { token, isValid: true } });
  const user = await User.findByPk(session.userId);
  if (user.roleId != 2 && user.cafeId != shopId) {
    return res.redirect(process.env.FRONTEND_URI);
  }

  await spotifyService.destroyDeviceAccessToken(shopId);
  res.redirect(`${process.env.FRONTEND_URI}/${shopId}`);
});

setInterval(async () => {
  Object.keys(userHelper.qrCodeSocketMap).forEach((socketId) => {
    const randomAuthCode = generateRandomString(11);
    userHelper.storeQRCode(socketId, randomAuthCode); // Update QR code with new value and shopId
    io.to(socketId).emit("res_guest_side", randomAuthCode); // Emit new QR code to client
  });
}, 20000);

// Periodically check the playback status and play the next song if needed
setInterval(async () => {
  for (const shopId in spotifyService.rooms) {
    const room = spotifyService.rooms[shopId];
    const playbackState = await spotifyService.getCurrentPlaybackState(shopId);

    if (!spotifyService.rooms[shopId].paused) {
      if (
        playbackState &&
        !playbackState.is_playing &&
        playbackState.currently_playing_type === "track"
      ) {
        await spotifyService.playInSpotify(shopId);
        const queue = await spotifyService.getQueue(shopId);
        io.to(shopId).emit("updateQueue", queue);
      } else if (playbackState) {
        const queueItems = spotifyService.rooms[shopId].queue || [];

        if (playbackState.item && playbackState.item.duration_ms) {
          const remainingTime =
            playbackState.item.duration_ms - playbackState.progress_ms;
          if (
            remainingTime <= 40000 &&
            remainingTime > 12000 &&
            spotifyService.rooms[shopId].nextTrack === ""
          ) {
            // Use a while loop to handle removals and continue iterating correctly

            const subscriptionStatus =
              await spotifyService.getUserSubscriptionStatus(shopId);

            if (subscriptionStatus == "premium")
              spotifyService.rooms[shopId].disableRequest = false;

            let index = 0;
            while (
              index < queueItems.length &&
              spotifyService.rooms[shopId].nextTrack === ""
            ) {
              const item = queueItems[index];
              if (item[1].length < item[2].length) {
                spotifyService.rooms[shopId].queue[index][3] = true;
                spotifyService.rooms[shopId].queue[index][4] = false; //false means will not be played, for frontend

                if (subscriptionStatus !== "premium") {
                  spotifyService.rooms[shopId].queue[index][4] = false; //false means will not be played, for frontend
                  spotifyService.rooms[shopId].disableRequest = true;
                }

                console.log(spotifyService.rooms[shopId].queue[index]);
                index++;
                continue;
              } else {
                // If 20 seconds or less remaining, set the next track to be played
                spotifyService.rooms[shopId].queue[index][3] = true;
                spotifyService.rooms[shopId].queue[index][4] = true; //true means will be played, for frontend

                if (subscriptionStatus !== "premium") {
                  spotifyService.rooms[shopId].queue[index][4] = false; //false means will not be played, for frontend
                  spotifyService.rooms[shopId].disableRequest = true;

                  index++;
                  continue;
                }

                spotifyService.rooms[shopId].nextTrack = item[0];
                console.log("set " + spotifyService.rooms[shopId].nextTrack);

                console.log(spotifyService.rooms[shopId].queue[index]);
              }
            }
          }

          if (remainingTime <= 12000) {
            // If 10 seconds or less remaining and next track is set, add it to Spotify queue
            await spotifyService.playNextInQueue(
              shopId,
              spotifyService.rooms[shopId].nextTrack
            );
            spotifyService.rooms[shopId].nextTrack = "";
          }
        } else {
          console.log(
            "No track is currently playing or duration information is not available."
          );
        }
      }
    }

    if (playbackState?.is_playing) {
      io.to(shopId).emit("updateCurrentSong", playbackState);

      const lyrics = await spotifyService.fetchRandomTrackLyrics(
        shopId,
        playbackState.item.id,
        true
      );
      console.log("force");
      io.to(shopId).emit("updateLyrics", lyrics.lines);
    }

    const queue = await spotifyService.getQueue(shopId);
    io.to(shopId).emit("updateQueue", queue);

    if (room.refreshTimeRemaining > 0) {
      room.refreshTimeRemaining -= 8000; // Decrease by 8000 ms (your interval)
    } else {
      try {
        await spotifyService.refreshAccessToken(shopId);
        console.log("refreshing " + shopId);
      } catch (error) {
        console.error(
          `Failed to refresh token for room ${shopId}: ${error.message}`
        );
      }
    }
  }

  console.log("tick");
}, 8000);

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
app.use("/cafe", cafeRoutes);
app.use("/item", itemRoutes);
app.use("/material", materialRoutes);
app.use("/mutation", materialMutationRoutes);
app.use("/table", tableRoutes);
app.use("/transaction", transactionRoutes);

const cron = require("node-cron");
const {
  createReportForAllCafes,
} = require("./controllers/transactionController");

// Schedule a task to run every day at midnight
cron.schedule("45 7 * * *", async () => {
  console.log("Running daily report generation for all cafes...");
  await createReportForAllCafes();
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
