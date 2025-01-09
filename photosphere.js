const CLIENT_ID = '824279225081-mmrvha4gr4l13jp7d9k25a917mu2elg0.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/streetviewpublish';
const API_KEY = 'AIzaSyDjlX0EgBOzuIs9y-ibufnqnYLkJpPAhxU';
var client = null;
var access_token = null;

function initClient(){
   client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      prompt: '',
      callback: tokenResponse => {
         access_token = tokenResponse.access_token;
         sessionStorage.setItem('secureToken', access_token);
         sessionStorage.setItem('expireToken', parseInt(Date.now()/1000, 10) + tokenResponse.expires_in - 60); // 60 segundos de margem de segurança
         console.log(access_token);
      },
   });
}
function revokeToken(){
   google.accounts.oauth2.revoke(access_token, () => {console.log('access token revoked')});
}
/*
Gera um novo token de acesso OAuth ou retorna o atual caso ainda esteja válido
*/
function newToken(){
   return  new Promise((resolve, reject) => {
      if(sessionStorage.getItem('secureToken') !== null && parseInt(Date.now()/1000, 10) < parseInt(sessionStorage.getItem('expireToken'), 10)){
         console.log(access_token);
         resolve(sessionStorage.getItem('secureToken'));
      }else{
         client.requestAccessToken();
         resolve(access_token);
      }
   });
}

/*
Solicita uma URL para upload de foto.
@param {String} token - o token de acesso OAuth 2.0
*/
function getUploadURL(token){
   const url = `https://streetviewpublish.googleapis.com/v1/photo:startUpload?key=${API_KEY}`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               console.log(`f:getUploadURL()
status:${xhr.status}
response:${xhr.response.uploadUrl}`);
               resolve(xhr.response.uploadUrl);
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send();
   });
}

/*
Envia uma foto para o Street View por meio da URL de upload. Somente o arquivo, sem metadados.
@param {String} token - o token de acesso OAuth 2.0
@param {String} data - o id de um input file
@param {String} uploadUrl - URL retornada pelo método getUploadURL()
*/
function sendImageData(token, data, uploadUrl){
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               console.log(`f:sendImageData()
status:${xhr.status}
response:${xhr.response}`);
               resolve(true); // Em caso de sucesso a resposta é vazia
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send(document.getElementById(data).files[0]);
   });
}

/*
Envia os metadados de uma foto no Street View para concluir o upload.
@param {String} token - o token de acesso OAuth 2.0
@param {String} uploadUrl - ID de uma foto
@param {String} latitude - Latitude do local onde a foto foi registrada  no formato decimal
@param {String} longitude - Longitude do local onde a foto foi registrada no formato decimal
*/
function sendMetadata(token, uploadUrl, latitude, longitude){
   const data = JSON.stringify({
      "uploadReference":{
         "uploadUrl": uploadUrl
      },
      "pose":{
         "latLngPair":{
            "latitude": latitude,
            "longitude": longitude
         }
      }
   });
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      let url = `https://streetviewpublish.googleapis.com/v1/photo?key=${API_KEY}`;
      xhr.responseType = 'json';
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               console.log(`f:sendMetadata()
status:${xhr.status}
response:${xhr.response}`);
               resolve(xhr.response);
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send(data);
   });
}

/*
Atualiza as conexões de uma foto no Street View.
@param {String} token - o token de acesso OAuth 2.0
@param {String} photoId - ID de uma foto
@param {String} targetPhotoId - ID de uma foto para onde apontar
*/
function updateConnections(token, photoId, targetPhotoId){
   const data = JSON.stringify({
      "connections": [{
         "target": {
            "id": targetPhotoId
         }
      }]
   });
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      let url = `https://streetviewpublish.googleapis.com/v1/photo/${photoId}?key=${API_KEY}&updateMask=connections`;
      xhr.responseType = 'json';
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               console.log(`f:updateConnections()
status:${xhr.status}
response:${xhr.response}`);
               resolve(xhr.response);
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send(data);
   });
}

/*
Deleta uma foto no Street View.
@param {String} token - o token de acesso OAuth 2.0
@param {String} photoId - ID de uma foto
*/
function deletePhoto(token, photoId){
   const url = `https://streetviewpublish.googleapis.com/v1/photo/${photoId}?key=${API_KEY}`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('DELETE', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               console.log(`f:deletePhoto()
status:${xhr.status}
response:${xhr.response}`);
               resolve(true); // Em caso de sucesso a resposta é um JSON vazio
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send();
   });
}

/*
Recupera detalhes sobre uma foto no Street View.
@param {String} token - o token de acesso OAuth 2.0
@param {String} photoId - ID de uma foto
*/
function getPhoto(token, photoId){
   const url = `https://streetviewpublish.googleapis.com/v1/photo/${photoId}?key=${API_KEY}`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               console.log(xhr.response);
               console.log(`f:getPhoto()
status:${xhr.status}
response:${xhr.response}`);
               resolve(xhr.response);
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send();
   });
}

/*
Recupera uma lista de fotos no Street View.
@param {String} token - o token de acesso OAuth 2.0
*/
function listPhotos(token){
   const url = `https://streetviewpublish.googleapis.com/v1/photos?key=${API_KEY}`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               console.log(xhr.response);
               console.log(`f:listPhotos()
status:${xhr.status}
response:${xhr.response}`);
               resolve(xhr.response);
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send();
   });
}

function sendPhotosphere(){
   newToken().then(t => {
      getUploadURL(t).then(uploadUrl => {
         sendImageData(t, uploadUrl).then(() => {
            sendMetadata(t, uploadUrl, document.getElementById('latitude').value, document.getElementById('longitude').value);
         });
      });
   });
}