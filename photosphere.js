const CLIENT_ID = '824279225081-mmrvha4gr4l13jp7d9k25a917mu2elg0.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/streetviewpublish https://www.googleapis.com/auth/drive.file';
var client = null;
var access_token = null;

/*
Inicializa o GSI (Google Identity Service)
*/
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

/*
Revoga o token de acesso OAuth atual
*/
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

function log(a, b, c){
   console.log(`${a}`);
   console.log(`${b}`);
   console.log(`${c}`);
}
/*
Solicita uma URL para upload de foto.
@param {String} token - o token de acesso OAuth 2.0
*/
function getUploadURL(token){
   const url = `https://streetviewpublish.googleapis.com/v1/photo:startUpload`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               log(`f:getUploadURL()`, `status:${xhr.status}`, `response:${xhr.response.uploadUrl}`);
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
               log(`f:sendImageData()`, `status:${xhr.status}`, `response:${xhr.response}`);
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
      let url = `https://streetviewpublish.googleapis.com/v1/photo`;
      xhr.responseType = 'json';
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               log(`f:sendMetadata()`, `status:${xhr.status}`, `response:${xhr.response}`);
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
Cria uma conexão bidirecional entre duas fotos no Street View.
@param {String} token - o token de acesso OAuth 2.0
@param {String} photoId1 - ID de uma foto
@param {String} photoId2 - ID de uma foto
*/
function updateConnections(token, photoId1, photoId2){
   const data = JSON.stringify({
      "updatePhotoRequests": [
         {
            "photo": {
                "photoId": {
                    "id": photoId1
                },
                "connections": [{
                    "target": {
                       "id": PhotoId2
                    }
                 }]
            },
            "updateMask": "connections"
         },
         {
            "photo": {
                "photoId": {
                    "id": photoId2
                },
                "connections": [{
                    "target": {
                       "id": PhotoId1
                    }
                 }]
            },
            "updateMask": "connections"
         }
      ]
   });
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      let url = `https://streetviewpublish.googleapis.com/v1/photos:batchUpdate`;
      xhr.responseType = 'json';
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               log(`f:updateConnections()`, `status:${xhr.status}`, `response:${xhr.response}`);
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
   const url = `https://streetviewpublish.googleapis.com/v1/photo/${photoId}`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('DELETE', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               log(`f:deletePhoto()`, `status:${xhr.status}`, `response:${xhr.response}`);
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
   const url = `https://streetviewpublish.googleapis.com/v1/photo/${photoId}`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               log(`f:getPhoto()`, `status:${xhr.status}`, `response:${xhr.response}`);
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
@param {String} pageToken - um token obtido na chamada anterior para obter a próxima pagina de resultados
*/
function listPhotos(token, pageToken = ''){
   typeof(pageToken) !== 'undefined'
   let url = `https://streetviewpublish.googleapis.com/v1/photos${pageToken === '' ? '' : '?&pageToken=' + pageToken}`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               log(`f:listPhotos()`, `status:${xhr.status}`, `response:${xhr.response}`);
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
         sendImageData(t, 'photo', uploadUrl).then(() => {
            sendMetadata(t, uploadUrl, document.getElementById('latitude').value, document.getElementById('longitude').value);
         });
      });
   });
}