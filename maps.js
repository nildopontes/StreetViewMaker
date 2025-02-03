var db, map, markers = [], lines = [];
function initMap(){ // incluir o javascript programaticamente somente depois que receber uma API Key
   map = new google.maps.Map(document.getElementById('workspace'), {
      center: { lat: -9.519195, lng: -35.776539 },
      zoom: 15,
      mapId: "project",
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: true,
   });
}
function sha1(message){
   return new Promise((resolve, reject) => {
      let msgUint8 = new TextEncoder().encode(message);
      window.crypto.subtle.digest('SHA-256', msgUint8).then(hashBuffer => {
         let hashArray = Array.from(new Uint8Array(hashBuffer));
         resolve(hashArray.map(b => b.toString(16).padStart(2, '0')).join(''));
      });
   });
}
function addMarker(lat, lng, name){
   let marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: lat, lng: lng },
      //position lat: -9.519195, lng: -35.776539
      title: name
   });
   sha1(lat.toString() + lng.toString()).then(digest => {
      marker.data = digest;
      markers.push(marker);
      marker.setMap(map);
   });
}
function removeMarker(data){
   markers.map((x, i) => {
      if(markers[i].data == data){
         markers[i].map = null;
         markers.splice(i, 1);
      }
   });
}
function renameMarker(data, newName){
   markers.map((x, i) => {
      if(markers[i].data == data){
         markers[i].title = newName;
      }
   });
}
/* lat:-9.51771430373315, lng:-35.77610951128148}
   lat:-9.51796825120393, lng:-35.77473622026586} */
function addLine(lat1, lng1, lat2, lng2){
   let coords = [
      {lat: lat1, lng: lng1},
      {lat: lat2, lng: lng2}
   ];
   let line = new google.maps.Polyline({
      path: coords,
      geodesic: true,
      strokeColor: '#6495ED',
      strokeOpacity: 1.0,
      strokeWeight: 8
   });
   sha1(lat1.toString() + lng1.toString() + lat2.toString() + lng2.toString()).then(digest => {
      line.data = digest;
      lines.push(line);
      line.setMap(map);
   });
}
function removeLine(data){
   lines.map((x, i) => {
      if(lines[i].data == data){
         lines[i].setMap(null);
         lines.splice(i, 1);
      }
   });
}
window.addEventListener('load', event => { // Definir um uso par este trecho
   map.addListener('click', function(e){
      console.log(e.latLng.lat(), e.latLng.lng());
   });
});
function addPhoto(projectName, idPhoto, lat, lng, photoName){
   let found = 0;
   db.projects.map((x, i) => {
      if(db.projects[i].name == projectName){
         db.projects[i].photos.push({
            "photoId": idPhoto,
            "name": photoName,
            "latLng": [lat, lng],
            "connections": []
         });
         addMarker(lat, lng, photoName);
         found ++;
         getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive));
         alert('Foto adicionada com sucesso.');
      }
   });
   if(found == 0) alert('Erro. O projeto não existe.');
}
function addProject(){
   let name = prompt('Escolha um nome para o projeto.');
   if(name === null || name.length == 0){
      alert('O nome precisa ter pelo menos 1 caractere.');
      return;
   }
   let found = 0;
   db.projects.map((x, i) => {
      if(db.projects[i].name == name) found++;
   });
   if(found > 0){
      alert('Este projeto já existe.');
   }else{
      db.projects.push({
         "name": name,
         "photos": []
      });
      getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive));
      alert('Projeto criado com sucesso.');
   }
}
function removePhoto(photoId, projectName){ // Fazer as alterações no mapa
   let found = 0;
   db.projects.map((x, i) => {
      if(db.projects[i].name == projectName){
         db.projects[i].photos.map((y, j) => {
            if(db.projects[i].photos[j].photoId == photoId){
               found++;
               getToken().then(t => {
                  deletePhoto(t, photoId).then(r => {
                     if(r === true){
                        db.projects[i].photos[j].splice(j, 1);
                        updateFile(t, JSON.stringify(db), db.idOnDrive);
                        alert('Foto removida com sucesso.');
                     }
                  }).catch(e => alert(`A foto foi encontrada mas ocorreu um erro ao tentar apagar. ${e}`));
               
               });
            }
         });
      }
   });
   if(found == 0) alert('A foto não foi encontrada. Verifique se o ID da foto e nome do projeto estão corretos.');
}
function renamePhoto(photoId, newName, projectName){
   let found = 0;
   db.projects.map((x, i) => {
      if(db.projects[i].name == projectName){
         db.projects[i].photos.map((y, j) => {
            if(db.projects[i].photos[j].photoId == photoId){
               db.projects[i].photos[j].name = newName;
               renameMarker(sha1(db.projects[i].photos[j].latLng[0] + db.projects[i].photos[j].latLng[1]), newName);
               found++;
               getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive));
               alert('Foto renomeada com sucesso.');
            }
         });
      }
   });
   if(found == 0) alert('A foto não foi encontrada. Verifique se o ID da foto e nome do projeto estão corretos.');
}
function addConnection(photoId1, photoId2, projectName){ // Fazer as alterações no mapa 
   if(photoId1 == photoId2){                        // Criar uma função para definir a prioridade entre photoId1 e photoId2 para decidiar quais coordenadas vão primeiro no cálculo do hash. Devo criar uma lógica com base em algum caractere do ID
      alert('É necessário 2 IDs de fotos.');
      return;
   }
   let found = 0;
   db.projects.map((x, i) => {
      if(db.projects[i].name == projectName){
         found++;
         db.projects[i].photos.map((y, j) => {
            if(db.projects[i].photos[j].photoId == photoId1 || db.projects[i].photos[j].photoId == photoId2){
               found++;
            }
         });
      }
   });
   if(found == 3){
      db.projects.map((x, i) => {
         if(db.projects[i].name == projectName){
           // let lat1, lat2, lng1, lng2;
            db.projects[i].photos.map((y, j) => {
               if(db.projects[i].photos[j].photoId == photoId1){
                  if(db.projects[i].photos[j].connections.indexOf(photoId2) == -1){
                     db.projects[i].photos[j].connections.push(photoId2);
                     getToken().then(t => updateConnections(t, photoId1, db.projects[i].photos[j].connections));
                  }
               }
               if(db.projects[i].photos[j].photoId == photoId2){
                  if(db.projects[i].photos[j].connections.indexOf(photoId1) == -1){
                     db.projects[i].photos[j].connections.push(photoId1);
                     getToken().then(t => updateConnections(t, photoId2, db.projects[i].photos[j].connections));
                  }
               }
            });
         }
      });
      getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive));
      alert('Conexão criada com sucesso.');
   }else{
      alert('Algo não foi encontrado. Verifique se as informações estão corretas.');
   }
}
function removeConnection(photoId1, photoId2, projectName){ // Fazer as alterações no mapa
   if(photoId1 == photoId2){
      alert('É necessário 2 ID de fotos diferentes.');
      return;
   }
   let found = 0;
   db.projects.map((x, i) => {
      if(db.projects[i].name == projectName){
         found++;
         db.projects[i].photos.map((y, j) => {
            if(db.projects[i].photos[j].photoId == photoId1 || db.projects[i].photos[j].photoId == photoId2){
               found++;
            }
         });
      }
   });
   if(found == 3){
      db.projects.map((x, i) => {
         if(db.projects[i].name == projectName){
            db.projects[i].photos.map((y, j) => {
               if(db.projects[i].photos[j].photoId == photoId1){
                  found = db.projects[i].photos[j].connections.indexOf(photoId2);
                  if(found != -1){
                     db.projects[i].photos[j].connections.splice(found, 1);
                     getToken().then(t => {
                        updateConnections(t, photoId1, db.projects[i].photos[j].connections);
                     }).catch(e => alert(`Ocorreu um erro ao atualizar as conexões. ${e}`));
                  }
               }
               if(db.projects[i].photos[j].photoId == photoId2){
                  found = db.projects[i].photos[j].connections.indexOf(photoId1);
                  if(found != -1){
                     db.projects[i].photos[j].connections.splice(found, 1);
                     getToken().then(t => {
                        updateConnections(t, photoId2, db.projects[i].photos[j].connections);
                     }).catch(e => alert(`Ocorreu um erro ao atualizar as conexões. ${e}`));
                  }
               }
            });
         }
      });
      getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive));
      alert('Conaxão removida com sucesso.')
   }else{
      alert('Algo não foi encontrado. Verifique se as informações estão corretas.');
   }
}
function removeProject(name){
   db.projects.map((x, i) => {
      if(db.projects[i].name == name){
         if(db.projects[i].photos.length > 0){
            alert('Não é permitido apagar projetos que possuem fotos. Remova todas as fotos antes.');
         }else{
            db.projects.splice(i, 1);
            getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive));
            alert('Projeto apagado com sucesso');
         }
      }
   });
}
function renameProject(currentName, newName){
   let found = 0;
   db.projects.map((x, i) => {
      if(db.projects[i].name == currentName){
         db.projects[i].name = newName;
         found++;
      }
   });
   if(found > 0){
      getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive));
      alert('Projeto renomeado com sucesso.');
   }else{
      alert('Este projeto não existe.');
   }
}
function changeAPI_KEY(newKey){
   db.API_KEY = newKey;
   alert('Nova API_KEY salva com sucesso.');
}