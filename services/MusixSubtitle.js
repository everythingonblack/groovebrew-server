const axios = require('axios');
const stringSimilarity = require('string-similarity');

// Function to find tracks in Musixmatch based on Spotify track information
const findMusixmatchTracks = async (spotifyTrackName, spotifyArtist) => {
    try {
        const response = await axios.get('https://api.musixmatch.com/ws/1.1/track.search', {
            params: {
                apikey: '30b353d80e54a5a41f7bab679c50b606',
                q_track: spotifyTrackName,
                q_artist: spotifyArtist,
                page_size: 5, // Limiting to 5 results for demonstration
                f_has_lyrics: 1 // Filter tracks that have lyrics
            }
        });

        if (response.data.message.header.status_code !== 200) {
            throw new Error('Failed to fetch tracks from Musixmatch');
        }

        return response.data.message.body.track_list.map(track => ({
            track_id: track.track.track_id,
            track_name: track.track.track_name,
            artist_name: track.track.artist_name
        }));
    } catch (error) {
        console.error('Error fetching tracks from Musixmatch:', error);
        throw error;
    }
};

// Function to find the best matching track in Musixmatch based on Spotify track information
const findBestMatchInMusixmatch = async (spotifyTrackName, spotifyArtist, musixmatchTracks) => {
    let bestMatch = null;
    let bestScore = 0;

    musixmatchTracks.forEach(track => {
        const musixmatchTrackName = track.track_name;
        const musixmatchArtist = track.artist_name;

        const nameSimilarity = stringSimilarity.compareTwoStrings(spotifyTrackName, musixmatchTrackName);
        const artistSimilarity = stringSimilarity.compareTwoStrings(spotifyArtist, musixmatchArtist);

        const overallScore = (nameSimilarity + artistSimilarity) / 2;

        if (overallScore > bestScore) {
            bestScore = overallScore;
            bestMatch = track;
        }
    });

    return bestMatch;
};

// Function to get subtitle (lyrics) from Musixmatch using track ID
const getMusixmatchSubtitle = async (musixmatchTrackId) => {
    try {
        const response = await axios.get('https://api.musixmatch.com/ws/1.1/track.subtitle.translation.get', {
            params: {
                apikey: '30b353d80e54a5a41f7bab679c50b606',
                track_id: musixmatchTrackId
            }
        });

        if (response.data.message.header.status_code !== 200) {
            throw new Error('Failed to fetch subtitle from Musixmatch' + response.data.message);
        }

        return response.data.message.body.subtitle.subtitle_body;
    } catch (error) {
        console.error('Error fetching subtitle from Musixmatch:', error);
        throw error;
    }
};

// Complete workflow to integrate Spotify and Musixmatch
const completeWorkflow = async (trackName, trackArtist) => {
    try {
        const musixmatchTracks = await findMusixmatchTracks(trackName, trackArtist);
        const bestMatch = await findBestMatchInMusixmatch(trackName, trackArtist, musixmatchTracks);

        if (!bestMatch) {
            throw new Error('No suitable match found in Musixmatch');
        }

        const musixmatchTrackId = bestMatch.track_id;
        const subtitle = await getMusixmatchSubtitle(musixmatchTrackId);

        console.log('Best Match in Musixmatch:', bestMatch);
        console.log('Subtitle:', subtitle);

        return { bestMatch, subtitle };
    } catch (error) {
        console.error('Error completing workflow:', error);
        throw error;
    }
};

module.exports = completeWorkflow;
