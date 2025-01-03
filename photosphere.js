const CLIENT_ID = '824279225081-mmrvha4gr4l13jp7d9k25a917mu2elg0.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/streetviewpublish';
var client = null;
var access_token = null;

function initClient(){
   client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      prompt: '',
      callback: tokenResponse => {
         access_token = tokenResponse.access_token;
         sessionStorage.setItem('secToken', access_token);
         sessionStorage.setItem('expToken', parseInt(Date.now()/1000, 10) + tokenResponse.expires_in - 60); // 60 segundos de margem de segurança
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
      if(sessionStorage.getItem('secToken') !== null && parseInt(Date.now()/1000, 10) < parseInt(sessionStorage.getItem('expToken'), 10)){
         resolve(sessionStorage.getItem('secToken'));
      }else{
         client.requestAccessToken();
         resolve(access_token);
      }
   });
}