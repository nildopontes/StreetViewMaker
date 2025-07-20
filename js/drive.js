/*
Envia os metadados dos arquivo para o Google Drive. Somente os metadados.
@param {String} token - o token de acesso ao GDrive
*/
function sendMetadata(token){
   const data = JSON.stringify({
      "name": "StreetViewDB.json"
   });
   const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable';
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-type', 'application/json');
      xhr.setRequestHeader('X-Upload-Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               resolve(xhr.getResponseHeader('Location'));
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send(data);
   });
}
/*
Envia os dados de um arquivo para o GDrive, uma vez que os metadados já foram enviados com a função sendMetadata()
@param {String} token - o token de acesso ao GDrive
@param {Uint8Array/String} data - o conteúdo do arquivo
@param {String} pathResumable - o path para o arquivo obtido na função sendMetadata()
*/
function sendFile(token, data, pathResumable){
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('PUT', pathResumable, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               resolve(xhr.response.id);
            }else{
               reject(`Error: status code ${xhr.status}.`);
            }
         }
      }
      xhr.send(data);
   });
}
/*
Altera o conteúdo de um arquivo do Google Drive pelo id
@param {String} token - o token de acesso ao GDrive
@param {Uint8Array/String} data - o novo conteúdo do arquivo
@param {String} fileId - o ID do arquivo
*/
function updateFile(token, data, fileId){
   if(data.length == 0) return;
   var url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('PATCH', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               resolve(xhr.response);
            }else{
               reject(`HTTP status code ${xhr.status}.`);
            }
         }
      }
      xhr.send(data);
   });
}
/*
Baixa um arquivo armazendo no Google Drive
@param {String} token - o token de acesso ao GDrive
@param {String} id - o id do arquivo no Google Drive
*/
function getFile(token, id){
   const url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               resolve(xhr.response);
            }else{
               reject(`Error: status code ${xhr.status}`);
            }
         }
      }
      xhr.send();
   });
}
/*
Busca o arquivo que armazena os dados do usuário no Google Drive, se não encontrar então cria um. O conteúdo é resolvido numa Promise
@param {String} token - o token de acesso ao GDrive
*/
function discoverDatabaseID(token){
   const url = `https://www.googleapis.com/drive/v3/files?pageSize=1&q=name%3d%27StreetViewDB.json%27+and+trashed%3dfalse`;
   return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onreadystatechange = function() {
         if(xhr.readyState == 4){
            if(xhr.status >= 200 && xhr.status <= 206){
               if(xhr.response.files.length > 0){
                  getFile(token, xhr.response.files[0].id).then(r => {
                     if(typeof(r.idOnDrive) === 'undefined') reject('A estrutura do arquivo é inválida.');
                     if(r.idOnDrive == 'idondrive'){
                        r.idOnDrive =  xhr.response.files[0].id;
                     }
                     resolve(r);
                  });
               }else{
                  sendMetadata(token).then(path => {
                     let emptyFile = {
                        "idOnDrive": "idondrive",
                        "projects": []
                     };
                     sendFile(token, JSON.stringify(emptyFile), path).then(id => {
                        emptyFile.idOnDrive = id;
                        updateFile(token, JSON.stringify(emptyFile), id).then(r => {
                           resolve(emptyFile);
                           alert('StreetViewDB.json criado em sua conta Google Drive. Não delete.');
                        });
                     });
                  });
               }
            }else{
               reject(`Error: status code ${xhr.status}`);
            }
         }
      }
      xhr.send();
   });
}
