const CLIENT_ID = '824279225081-mmrvha4gr4l13jp7d9k25a917mu2elg0.apps.googleusercontent.com';
const SCOPE = 'https://www.googleapis.com/auth/streetviewpublish https://www.googleapis.com/auth/drive.file';
var client = null;
var access_token = null;

/*
Inicializa o GSI (Google Identity Service)
*/
function initClient(){ // Redirecionar para projects.html
   client = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      prompt: '',
      callback: tokenResponse => { // Verificar se o usuário aprovou todos os escorpos e emitir um erro caso não tenha aprovado
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
   google.accounts.oauth2.revoke(access_token, () => console.log('access token revoked'));
}

/*
Gera um novo token de acesso OAuth ou retorna o atual caso ainda esteja válido
*/
function newToken(){ // Adicionar um timeout para contar o tempo e exibir uma tela para o usuário renovar a sessão. Talvez seja necessário separa esta função em duas partes: uma que retorna o token e outra que de fato requisita um novo token
   return new Promise((resolve, reject) => {
      if(sessionStorage.getItem('secureToken') !== null && parseInt(Date.now()/1000, 10) < parseInt(sessionStorage.getItem('expireToken'), 10)){
         access_token = sessionStorage.getItem('secureToken');
         console.log(access_token);
         resolve(sessionStorage.getItem('secureToken'));
      }else{
         client.requestAccessToken(); // Esta ação deve partir de um clique do usuário
         resolve(access_token);
      }
   });
}