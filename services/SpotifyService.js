const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

class SpotifyService {
  constructor() {
    this.sp_dc =
      "AQBjVxf81hHa0xaJr_j3ly1u-aYq8hAutMXHRrKo12bAG28YiXISdC9NEIQgDvxYE1oyo-a9rpVTt9aSK0kY0dtOinwW8bcsVlxzmol0wNFLxFU77Jg-ifW4QezLwlfNXA7coeoNeg-Hec8gcqTaBaxaZCwR99ODswEwRcUVcwrNMj323_8QJCuJeMhnGVNT89bv6XHHOcLpoZZ9Bf4Nn3S42Pxo";
    this.server_access_token = "";
    this.rooms = {}; // Store device and token info per room
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    // // Start token refresh interval
    // setInterval(() => {
    //   this.getServerAccessToken(true); // Set refresh flag to true
    //   console.log("refreshing access token");
    // }, 3600000); // 3600000 milliseconds = 1 hour
  }

  async getServerAccessToken() {
    if (!this.sp_dc) {
      console.log("SP_DC cookie is missing");
      return null;
    }

    const currentTime = Date.now(); // Current time in milliseconds

    // Check if the access token is available and if it's still valid
    if (this.server_access_token && this.accessTokenExpirationTimestampMs) {
      console.log("Checking token validity...");

      // If the current time is less than the expiration timestamp, the token is still valid
      if (currentTime < this.accessTokenExpirationTimestampMs) {
        console.log("Token is still valid.");
        return this.server_access_token;
      } else {
        console.log("Token has expired, fetching a new one...");
      }
    } else {
      console.log("No valid token found, fetching a new one...");
    }

    // Fetch a new access token
    try {
      const response = await fetch(
        "https://open.spotify.com/get_access_token?reason=transport&productType=web_player",
        {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36",
            "App-platform": "WebPlayer",
            "Content-Type": "text/html; charset=utf-8",
            Cookie: `sp_dc=${this.sp_dc}`,
          },
        }
      );

      const data = await response.json();
      console.log("Received data:", data);

      // Store the new access token and its expiration timestamp
      this.server_access_token = data.accessToken;
      this.accessTokenExpirationTimestampMs = data.accessTokenExpirationTimestampMs;

      console.log("New Access Token:", this.server_access_token);
      console.log("Access Token Expiration Timestamp:", this.accessTokenExpirationTimestampMs);

      return this.server_access_token;
    } catch (error) {
      console.error("Error fetching access token:", error);
      return null;
    }
  }

  
  async getAccessToken(roomId) {
    if (this.rooms[roomId]?.access_token)
      return this.rooms[roomId].access_token;
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "client_credentials",
      }),
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    this.rooms[roomId] = {
      ...this.rooms[roomId],
      access_token: response.data.access_token,
      nextTrack: "",
    };
    return response.data.access_token;
  }

  async getDeviceAccessToken(code, roomId) {
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { access_token, refresh_token } = response.data;
    this.rooms[roomId] = {
      ...this.rooms[roomId],
      access_token,
      refresh_token,
      refreshTimeRemaining: 3600000,
      paused: false,
    };

    return access_token;
  }

  async getUserSubscriptionStatus(roomId) {
    try {
      const token = await this.getAccessToken(roomId);
      if (!token) return null;

      const response = await axios.get("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.product; // Returns 'premium', 'free', 'open', etc.
    } catch (error) {
      console.error("Error fetching user subscription status:", error);
      return null;
    }
  }

  async refreshAccessToken(roomId) {
    const refresh_token = this.rooms[roomId]?.refresh_token;
    if (!refresh_token) throw new Error("No refresh token available");
    const response = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const { access_token } = response.data;
    this.rooms[roomId] = {
      ...this.rooms[roomId],
      access_token,
      refreshTimeRemaining: 3600000,
    };
    return access_token;
  }

  async getDeviceId(access_token, roomId) {
    const deviceResponse = await axios.get(
      "https://api.spotify.com/v1/me/player/devices",
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      },
    );
    if (deviceResponse.data.devices.length > 0) {
      this.rooms[roomId] = {
        ...this.rooms[roomId],
        deviceId: deviceResponse.data.devices[0].id,
      };
    } else {
      this.rooms[roomId] = {
        ...this.rooms[roomId],
        deviceId: null,
      };
    }
    return this.rooms[roomId].deviceId;
  }

  async destroyDeviceAccessToken(roomId) {
    this.rooms[roomId] = {
      ...this.rooms[roomId],
      access_token: "",
      refresh_token: "",
      deviceId: null,
      refreshTimeRemaining: -1,
      paused: false,
    };
  }

async getCanvasUrl(trackId) {
    const url = `https://api-partner.spotify.com/pathfinder/v1/query?operationName=canvas&variables=%7B%22uri%22%3A%22spotify%3Atrack%3A${trackId}%22%7D&extensions=%7B%22persistedQuery%22%3A%7B%22version%22%3A1%2C%22sha256Hash%22%3A%221b1e1915481c99f4349af88268c6b49a2b601cf0db7bca8749b5dd75088486fc%22%7D%7D`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + this.server_access_token,
                
                'Accept': 'application/json',
                'Referer': 'https://open.spotify.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
                'sec-ch-ua': '"Not_A Brand";v="99", "Google Chrome";v="109", "Chromium";v="109"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"'
            }
        });

        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }

        const data = await response.json();
        const canvasUrl = data.data.trackUnion.canvas.url;

        console.log('Canvas URL:', canvasUrl);
        return canvasUrl;

    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}
  async searchSongs(shopId, query) {
    if (query === "") return null;
    const token = await this.getAccessToken(shopId);
    const response = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: query,
        type: "track",
        limit: 5, // Limit the response to 5 songs
      },
    });

    return response.data.tracks.items.map((song) => ({
      trackId: song.id,
      name: song.name,
      artist: song.artists[0].name,
      album: song.album.name,
      duration_ms: song.duration_ms,
      image: song.album.images[0].url,
    }));
  }

  async getSongDetails(shopId, trackId) {
    const token = await this.getAccessToken(shopId);
    const response = await axios.get(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const song = response.data;
    return {
      trackId: song.id,
      name: song.name,
      artist: song.artists[0].name,
      album: song.album.name,
      duration_ms: song.duration_ms,
      image: song.album.images[0].url,
    };
  }

  async playOrPauseSpotify(roomId, action) {
    try {
      const room = this.rooms[roomId];
      if (!room) {
        console.error(`Room with ID ${roomId} does not exist`);
        return;
      }

      const deviceId = room.deviceId;
      if (!deviceId) {
        console.error("No device ID available for the specified room");
        return;
      }

      const token = await this.getAccessToken(roomId);
      if (!token) {
        console.error("Unable to get access token");
        return;
      }

      const playbackState = await this.getCurrentPlaybackState(roomId);
      if (playbackState) {
        room.paused = !playbackState.is_playing;
        if (action === "resume") {
          if (!playbackState) {
            console.error("Failed to get current playback state");
            return;
          }

          const { context, item, progress_ms } = playbackState;
          const contextUri = context?.uri;
          const trackUri = item?.uri;

          if (!trackUri) {
            console.error("No track URI found in the current playback state");
            return;
          }

          const url = "https://api.spotify.com/v1/me/player/play";

          await axios.put(
            url,
            {
              device_id: deviceId,
              uris: contextUri ? undefined : [trackUri],
              context_uri: contextUri,
              offset: contextUri ? { uri: trackUri } : undefined,
              position_ms: progress_ms,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          room.paused = false; // Update the paused state if needed
        } else if (!room.paused && action === "pause") {
          const url = "https://api.spotify.com/v1/me/player/pause";

          await axios.put(
            url,
            {
              device_id: deviceId,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

          room.paused = true; // Update the paused state if needed
        }
      }
    } catch (error) {
      // malas baca console.error(`Error trying to ${action} Spotify playback:`, error);
    }
  }

  async getCurrentPlaybackState(roomId) {
    const access_token = this.rooms[roomId]?.access_token;
    if (!access_token) {
      console.error("No access token available");
      return null;
    }

    const deviceId = this.rooms[roomId]?.deviceId;
    if (!deviceId) {
      console.error("No device_id available");
      return null;
    }

    try {
      const response = await axios.get("https://api.spotify.com/v1/me/player", {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      this.rooms[roomId].currentTrackId = response.data.item.id;
      return response.data;
    } catch (error) {
      // malas baca console.error('Error fetching current playback state:', error);/
      return null;
    }
  }

  async transferPlayback(roomId) {
    try {
      const room = this.rooms[roomId];
      const token = await this.getAccessToken(roomId);
      if (!token) return;

      const response = await axios.put(
        "https://api.spotify.com/v1/me/player",
        {
          device_ids: [room.deviceId],
          play: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.status === 204) {
        console.log(
          `Successfully transferred playback to device: ${room.deviceId}`,
        );
      } else {
        console.error(
          `Unexpected response status: ${response.status} when transferring playback`,
        );
      }
    } catch (error) {
      // malas baca console.error('Error transferring playback:', error);
    }
  }

  async playInSpotify(roomId) {
    try {
      const room = this.rooms[roomId];
      console.log("Attempting to play on device: " + room.deviceId);

      if (!room) return;

      const token = await this.getAccessToken(roomId);
      if (!token) return;

      const queue = room.queue || [];
      let deviceId = room.deviceId;

      if (!deviceId) {
        // Refresh device ID
        await this.getDeviceId(token);
        deviceId = this.rooms[roomId].deviceId;
      }

      if (!queue.length) return;

      const nextTrackId = queue[0][0] || "";

      // Attempt to play the next track
      await axios.put(
        `https://api.spotify.com/v1/me/player/play`,
        {
          uris: [`spotify:track:${nextTrackId}`],
          device_id: deviceId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      // Remove the played track from the queue
      queue.shift();
    } catch (error) {
      // malas baca console.error('Error playing next track in Spotify:', error);
      // Check if playback started successfully
      const playbackState = await this.getCurrentPlaybackState(roomId);
      if (!playbackState || !playbackState.is_playing) {
        console.log("Playback did not start, transferring playback...");
        const ref = await this.refreshDeviceId(roomId);
        if (ref) this.playInSpotify(roomId);
      }
    }
  }

  async refreshDeviceId(roomId) {
    try {
      const token = await this.getAccessToken(roomId);
      if (!token) return;

      await this.getDeviceId(token);
      const newDeviceId = this.rooms[roomId].deviceId;

      // Transfer playback to the new device to start playback
      const transfer = await this.transferPlayback(roomId, newDeviceId);
      return transfer;
    } catch (error) {
      // malas baca console.error('Error refreshing device ID and transferring playback:', error);
      return false;
    }
  }

  async transferPlayback(roomId, deviceId) {
    try {
      const token = await this.getAccessToken(roomId);
      if (!token) return;

      await axios.put(
        `https://api.spotify.com/v1/me/player`,
        {
          device_ids: [deviceId],
          play: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log(`Transferred playback to device ${deviceId}`);
      return true;
    } catch (error) {
      // malas baca console.error('Error transferring playback:', error);
      return false;
    }
  }

  async playNextInQueue(roomId, trackId = null) {
    try {
      const queue = this.rooms[roomId]?.queue || { queue: [] };
      const deviceId = this.rooms[roomId]?.deviceId;
      if (!queue || !deviceId) return;
      if (queue.length == 0) return;

      const token = await this.getAccessToken(roomId);
      if (!token) return;

      const nextTrackId = trackId || (queue[0] ? queue[0][0] : "") || ""; // Use the provided trackId or the next track in the queue

      let removeCount = 0;
      for (let i = 0; i < queue.length; i++) {
        if (queue[i][3] == true) {
          removeCount++;
        }
      }
      for (let i = 0; i < removeCount; i++) {
        queue.shift();
      }

      if (nextTrackId != "") {
        // Add the next track to the Spotify queue
        await axios.post(
          `https://api.spotify.com/v1/me/player/queue?uri=spotify:track:${nextTrackId}`,
          null,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      }
    } catch (error) {
      // malas baca console.error('Error playing next track in Spotify:', error);
      // Check if playback started successfully
      const playbackState = await this.getCurrentPlaybackState(roomId);
      if (!playbackState || !playbackState.is_playing) {
        console.log("Playback did not start, transferring playback...");
        const ref = await this.refreshDeviceId(roomId);
        if (ref)
          this.playNextInQueue(
            roomId,
            trackId || (queue[0] ? queue[0][0] : "") || "",
          );
      }
    }
  }

  addToQueue(roomId, userId, trackId) {
    try {
      const room = this.rooms[roomId] || { queue: [] }; // Initialize queue as an empty array if it doesn't exist
      room.queue = room.queue || []; // Ensure room.queue is initialized as an empty array if it doesn't exist
      const existingIndex = room.queue.findIndex((item) => item[0] === trackId);
      if (existingIndex !== -1) {
        // If the song already exists in the queue, just call voteForSong with the agree parameter
        this.voteForSong(roomId, userId, trackId, true);
      } else {
        // If the song is not in the queue, add it with the user's vote
        room.queue.push([trackId, [userId], [], false, false]);
        console.log("pushing")
      }
      this.rooms[roomId] = room;
    } catch (error) {
      // malas baca console.error('Error adding to queue:', error);
      throw error;
    }
  }

  removeFromQueue(roomId, trackId) {
    try {
      const room = this.rooms[roomId];
      if (room) {
        room.queue = room.queue.filter((song) => song[0] !== trackId);
      }
    } catch (error) {
      // malas baca console.error('Error removing from queue:', error);
      throw error;
    }
  }

  async getQueue(roomId) {
    try {
      const room = this.rooms[roomId] || { queue: [] };
      if (!room.queue) return [];

      const detailedQueue = [];
      for (let [trackId, agree, disagree, set, bePlayed] of room.queue) {
        const songDetails = await this.getSongDetails(roomId, trackId);
        detailedQueue.push({
          ...songDetails,
          agree: agree.length,
          disagree: disagree.length,
          set: set,
          bePlayed: bePlayed,
        });
      }
      return detailedQueue;
    } catch (error) {
      // malas baca console.error('Error getting queue:', error);
      throw error;
    }
  }

  voteForSong(roomId, userId, trackId, agreement) {
    try {
      const room = this.rooms[roomId];
      if (room) {
        const index = room.queue.findIndex((item) => item[0] === trackId);
        if (index !== -1) {
          // Check if userId already exists in the agreement or disagreement positions
          const agreeIndex = room.queue[index][1].indexOf(userId);
          const disagreeIndex = room.queue[index][2].indexOf(userId);

          if (agreeIndex === -1 && disagreeIndex === -1) {
            if (agreement) {
              // If user has not already agreed, add userId to agreement position
              room.queue[index][1].push(userId);
            } else {
              // If user has not already disagreed, add userId to disagreement position
              room.queue[index][2].push(userId);
            }
          }

          console.log(room.queue[index]);
        }
      }
    } catch (error) {
      // malas baca console.error('Error voting for song:', error);
      throw error;
    }
  }

  // Get the next song in the queue
  getNextSong(roomId) {
    const room = this.rooms[roomId];
    return room && room.queue.length > 0 ? room.queue[0] : null;
  }

  // Remove the first song in the queue
  removeFirstSong(roomId) {
    const room = this.rooms[roomId];
    if (room) {
      room.queue.shift();
    }
  }

  getRoomAccessToken(roomId) {
    try {
      return this.rooms[roomId].access_token || "";
    } catch (error) {
      console.error("Error getting room access token:", error);
      throw error;
    }
  }

  // Function to delete a room
  deleteRoom(roomId) {
    if (this.rooms[roomId]) {
      delete this.rooms[roomId];
      console.log(`Room ${roomId} deleted.`);
    }
  }

  // Function to get the device ID of a room
  getRoomDeviceId(roomId) {
    try {
      if (this.rooms[roomId]) {
        return this.rooms[roomId].deviceId;
      }
      return null;
    } catch (error) {
      console.error("Error getting room device ID:", error);
      throw error;
    }
  }

  async fetchRandomTrackLyrics(roomId, trackId, force) {
    try {
      if (!force) return this.rooms[roomId].lyric;

      const token = await this.getServerAccessToken();
      const formattedUrl = `https://spclient.wg.spotify.com/color-lyrics/v2/track/${trackId}?format=json&market=from_token`;
      try {
        const response = await axios.get(formattedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36",
            "App-platform": "WebPlayer",
            Authorization: `Bearer ${token}`,
          },
        });
        const { lyrics } = response.data;
        lyrics.lines.unshift({
          startTimeMs: "0",
          words: "♪",
          syllables: [],
          endTimeMs: "0",
        });

        // Store lyrics in room object
        this.rooms[roomId].lyric = lyrics;
        return lyrics;
      } catch (error) {
        // console.log(error);
        this.rooms[roomId].lyric = [];
        return [];
      }
    } catch (error) {
      console.error("Error fetching lyrics:", error);
      throw error;
    }
  }
}

module.exports = SpotifyService;
