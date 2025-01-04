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
               console.log(xhr.reponse.uploadUrl);
               resolve(xhr.reponse.uploadUrl);
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send();
   });
}

function sendImageData(token, data, pathResumable){
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('POST', pathResumable, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               console.log(xhr.responseText);
               resolve(xhr.responseText);
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send(data);
   });
}

function sendMetadata(token){
   
}

function updateMetadata(token){
   
}

function deleteImage(token){
   
}