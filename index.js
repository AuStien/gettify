const express = require('express');
const app = express();

const PORT = 5000;

const axios = require('axios');
const path = require('path');
const querystring = require('querystring');
const morgan = require('morgan');

const secrets = require('./secrets.json');			// File containg secrets (clientId, clientSecret, URIs and scopes)

app.use(express.static('/static'));					// Serve static files
app.use(express.json());       						// To support JSON-encoded bodies
app.use(express.urlencoded({ extended: true })); 	// To support URL-encoded bodies
app.use(morgan('tiny'))								// Logging


// Play song in Web Playback, plays new song if already started
// Return status code
app.get(('/play'), (req, res) => {
	const uri = req.header['context-uri']												// (Optional) Uri of song to be played
	const accessToken = req.header['access-token'];										// Access token
	const deviceId = req.query['device_id'] ? '?device_id=' + req.query.deviceId : ''	// (Optional) Id of device to play on

	axios.put('https://api.spotify.com/v1/me/player/play' + deviceId, { 'context_uri': uri }, {
		headers: {
			'Authorization': 'Bearer ' + accessToken,
			'Accept': 'application/json',
			'Content-Type': 'application/json'}
	})
	.then(response => {
		res.json(response.status);
	})
	.catch(error => {
		res.status(error.response.status).send(error.response.data)
	});
});

// Get spotify self user
// Requires: "access-token" header
// Returns: user object
app.get('/getUser', (req, res) => {
	
	axios.get('https://api.spotify.com/v1/me', {headers: {'Authorization': 'Bearer ' + req.headers['access-token']}})
	.then(response => {
		res.json(response.data);
	})
	.catch(error => {
		res.status(error.response.status).send(error.response.data)
	})
});

// GET The playlists of current user
// Requires: "access-token" header
// Returns: An array of all playlists
app.get('/getPlaylists', async (req, res) => {
	let items = [];
	let next = 'https://api.spotify.com/v1/me/playlists?limit=50';
	const options = {
		headers: {'Authorization': 'Bearer ' + req.header['access-token'],
					'Accept': 'application/json',
					'Content-Type': 'application/json'}
	};

	while(next !== null) {
		try {
			let curr = await axios.get(next, options);
			next = curr.data.next;
			items.push(curr.data.items);
		}catch(error) {
			res.status(error.response.status).send(error.response.data)
		}
	}
	res.json([].concat(...items));		//Converts array from 2d to 1d
});

// PUT Shuffle the player
// Requires: "access-token" header
// Returns: status code
app.put('/shuffle', (req, res) => {
	const deviceId = req.query['device_id'] ? '&device_id=' + req.query['device_id'] : ''		// (Optional) The id of device to be shuffled
	axios({
    	method: 'put',
        url: 'https://api.spotify.com/v1/me/player/shuffle?state=true' + deviceId,
        headers: {
            'Authorization': 'Bearer ' + req.header['access-token'],
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        data: {}
    	})
		.then(response => {
			res.json(response.status);
	  	}) //204
	  	.catch(error => {
			res.status(error.response.status).send(error.response.data)
	  });
});

//----------------------Login/Callback/Refresh/Listen---------------------------

// GET Login
// Redirects: to Spotify login
app.get(('/login'), (req, res) => {
	res.redirect('http://accounts.spotify.com/authorize' + 
		'?response_type=code' + 
		'&client_id=' + secrets.clientId + 
		'&scope=' + encodeURIComponent(secrets.scopes) + 
		'&redirect_uri=' + encodeURIComponent(secrets.redirectURI));
});

// GET Callback from Spotify login
// Requires: code
// Returns: accessToken, expires and refreshToken
app.get(('/callback'), (req, res) => {
	let code = req.query.code;	//Callback code to be used to get access token

	axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
		code: code,
		redirect_uri: secrets.redirectURI,
		grant_type: 'authorization_code',
		client_id: secrets.clientId,
		client_secret: secrets.clientSecret
	}))
	.then(response => {
		res.json({
			'accessToken': response.data.access_token,
			'expires': new Date(response.data.expires_in*1000 + Date.now()), 
			'refreshToken': response.data.refresh_token});
	})
	.catch(error => {
		console.log('Error', error)
        res.status(error.response.status).send(error.response.data);
	});
});

// POST Refresh access token
// Requires: refresh-token
// Returns: accessToken, expires and refreshToken if exists
app.post(('/refresh'), (req, res) => {
	axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
		grant_type: 'refresh_token',
		refresh_token: req.body['refresh-token'],
		client_id: secrets.clientId,
		client_secret: secrets.clientSecret
	}))
	.then(response => {
		res.json({
			'accessToken': response.data.access_token, 
			'expires': new Date(response.data.expires_in*1000 + Date.now()),
			'refreshToken': response.data.refresh_token
		});
	})
	.catch(error => {
		console.log('Error', error)
		res.status(error.response.status).send(error.response.data);
	});
});

// Start server on port PORT
app.listen(PORT, () => {
	console.log('Guettify running at port ' + PORT);
});