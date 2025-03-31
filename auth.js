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
         let page = window.location.pathname.split('/').reverse()[0];
         if(page == '' || page == 'index.html') window.location.href = 'projects.html';
      },
   });
}

/*
Revoga o token de acesso OAuth atual
*/
function revokeToken(){
   sessionStorage.removeItem('secureToken');
   sessionStorage.removeItem('expireToken');
   google.accounts.oauth2.revoke(access_token, () => console.log('access token revoked'));
}
function alertRedir(){
   if(sessionStorage.getItem('secureToken') !== null && parseInt(Date.now()/1000, 10) < parseInt(sessionStorage.getItem('expireToken'), 10)) return;
   alert('Sessão expirada.');
   window.location.href = 'index.html';
}
/*
Retorna o token OAuth atual caso ainda esteja válido
*/
function getToken(){
   return new Promise((resolve, reject) => {
      if(sessionStorage.getItem('secureToken') !== null && parseInt(Date.now()/1000, 10) < parseInt(sessionStorage.getItem('expireToken'), 10)){
         access_token = sessionStorage.getItem('secureToken');
         console.log(access_token);
         resolve(sessionStorage.getItem('secureToken'));
      }else{
         sessionStorage.removeItem('secureToken');
         sessionStorage.removeItem('expireToken');
         reject();
      }
   });
}
/*
Gera um novo token de acesso OAuth
*/
function newToken(){ // Criar um timeout para exibir um pedido de renovação da sessão a cada 60 minutos, antes que o token expire
   client.requestAccessToken();
}