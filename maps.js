var db, map, markers = {}, lines = [];
function initMap(){
   map = new google.maps.Map($('workspace'), {
      center: { lat: -9.598392783313042, lng: -35.73571500947498 },
      zoom: 12,
      mapId: "project",
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: true,
   });
   map.addListener('contextmenu', e => {
      if(window.confirm('Quer adicionar uma foto nesta localização?')){
         showForm(e.latLng.lat(), e.latLng.lng());
      }
   });
}
function $(id){
   return document.getElementById(id);
}
function projectIndex(name){
   return db.projects.findIndex(p => p.name == name);
}
function photoIndex(photoId){
   return project.photos.findIndex(p => p.photoId == photoId);
}
function getProject(name){
   return db.projects.find(p => p.name == name);
}
function getPhoto(photoId){
   return project.photos.find(p => p.photoId == photoId);
}
function hideMenu(){
   $('mask').style.display = 'none';
   $('submenu').style.display = 'none';
}
function checkboxClick(id, idConnection){
   $(id).checked ? addConnection(id, idConnection) : removeConnection(id, idConnection);
}
function getCoordinates(photoId){
   return project.photos.find(p => p.photoId == photoId).latLng;
}
function addMarker(lat, lng, id, name){
   let marker = new google.maps.marker.AdvancedMarkerElement({
      position: { lat: lat, lng: lng },
      title: name
   });
   marker.addEventListener('click', e => {
      if(getPhoto(id).thumbnail == ''){
         showLoading();
         getToken().then(t => {
            getPhotoInstance(t, id).then(p => {
               getPhoto(id).thumbnail = p.thumbnailUrl;
               getPhoto(id).download = p.downloadUrl;
               $('thumbnail').innerHTML = `<span onclick="hideThumbnail()">✖</span><img src="${p.thumbnailUrl}" onload="hideLoading()">`;
               updateFile(t, JSON.stringify(db), db.idOnDrive);
            });
         }).catch(() => alertRedir());
      }else{
         $('thumbnail').innerHTML = `<span onclick="hideThumbnail()">✖</span><img src="${getPhoto(id).thumbnail}" onload="hideLoading()">`;
      }
      $('mask').style.display = 'block';
      $('thumbnail').style.display = 'block';
   });
   marker.addEventListener('contextmenu', t => {
      $('photoTrash').onclick = () => {
         removePhoto(t.target.data);
         hideMenu();
      };
      $('photoRename').onclick = () => {
         renamePhoto(t.target.data);
         hideMenu();
      };
      $('photoConnections').onclick = () => {
         let items = '';
         project.photos.map(p => {
            if(p.photoId != t.target.data && haversineDistance(getCoordinates(p.photoId), getCoordinates(t.target.data)) < 10) items += `<div class="item"><input type="checkbox" onclick="checkboxClick(this.id, '${t.target.data}')" id="${p.photoId}" ${p.connections.includes(t.target.data) ? 'checked' : ''}/><label for="${p.photoId}">${p.name}</label></div>`;
         });
         $('submenu').innerHTML = items;
         let states = ['block',,,,'block','none'];
         $('submenu').style.display = states[$('submenu').style.display.length];
         $('submenu').style.left = t.clientX + 124 + 'px';
         $('submenu').style.top = t.clientY + 50 + 'px';
      };
      $('mask').style.display = 'block';
      $('menu').style.left = t.clientX + 'px';
      $('menu').style.top = t.clientY + 'px';
      $('menu').style.display = 'block';
      t.stopPropagation();
   });
   markers[id] = marker;
   marker.setMap(map);
}
function removeMarker(data){
   delete markers[data];
}
function renameMarker(data, newName){
   markers[data].title = newName;
}
function addLine(lat, lng, id1, id2){
   let i;
   if((i = lines.findIndex(l => (l.data.search(new RegExp(id1)) > -1) && (l.data.search(new RegExp(id2)) > -1))) > -1){
      let newCoord = lines[i].getPath().getArray();
      newCoord.push({lat: lat, lng: lng});
      lines[i].setPath(newCoord);
      return;
   }
   let coords = [
      {lat: lat, lng: lng}
   ];
   let line = new google.maps.Polyline({
      path: coords,
      geodesic: true,
      strokeColor: '#6495ED',
      strokeOpacity: 1.0,
      strokeWeight: 8
   });
   line.data = `${id1}, ${id2}`;
   lines.push(line);
   line.setMap(map);
}
function removeLine(id1, id2){
   let i;
   if((i = lines.findIndex(l => (l.data.search(new RegExp(id1)) > -1) && (l.data.search(new RegExp(id2)) > -1))) > -1){
      lines[i].setMap(null);
      lines.splice(i, 1);
   }
}
function hideThumbnail(){
   $('mask').style.display = 'none';
   $('thumbnail').style.display = 'none';
}
function showLoading(){
   $('loading').style.display = 'block';
}
function hideLoading(){
   $('loading').style.display = 'none';
}
function showForm(lat, lng){
   $('formUpload').style.display = 'block';
   $('lat').value = lat;
   $('lng').value = lng;
}
function hideForm(){
   $('formUpload').style.display = 'none';
   $('name').value = '';
   $('photo').value = '';
   $('lat').value = '';
   $('lng').value = '';
}
function submit(){
   if($('photo').value.length == 0 || $('name').value.length == 0){
      alert('Preencha todos os campos.');
   }else{
      showLoading();
      getToken().then(t => {
         getUploadURL(t).then(uploadUrl => {
            sendImageData(t, 'photo', uploadUrl).then(() => {
               sendMetadata(t, uploadUrl, $('lat').value, $('lng').value).then(r => {
                  addPhoto(r.photoId.id, parseFloat($('lat').value), parseFloat($('lng').value), $('name').value.trim());
                  updateFile(t, JSON.stringify(db), db.idOnDrive);
                  hideForm();
                  hideLoading();
               }).catch(e => {
                  alert(`${e} Provavelmente sua imagem não é compatível com o Street View devido à falta de algum metadado obrigatório.`);
                  hideForm();
                  hideLoading();
               });
            });
         });
      }).catch(() => alertRedir());
   }
}
function addPhoto(idPhoto, lat, lng, photoName){
   let photo = {
      "photoId": idPhoto,
      "name": photoName,
      "latLng": [lat, lng],
      "thumbnail": "",
      "download": "",
      "connections": []
   };
   project.photos.push(photo);
   addMarker(lat, lng, idPhoto, photoName);
   getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive).then(r => {
      alert('Foto adicionada com sucesso.');
   })).catch(() => alertRedir());
}
function listProjects(){
   let projects = '';
   db.projects.map(x => {
      projects += `<div class="project"><div class="name" onclick="window.location.href = 'project.html?p=${encodeURIComponent(x.name)}'">${x.name}</div><div class="btns"><span class="edit" onclick="renameProject('${x.name}')">✎</span>&nbsp;&nbsp;&nbsp;<span class="trash" onclick="removeProject('${x.name}')">✖</span></div></div>`;
   });
   $('projects').innerHTML = projects;
}
function addProject(){
   let name = prompt('Escolha um nome para o projeto.');
   if(name === null) return;
   name = name.trim();
   if(name.length == 0){
      alert('O nome precisa ter pelo menos 1 caractere.');
      return;
   }
   let i = projectIndex(name);
   if(i == -1){
      db.projects.push({
         "name": name,
         "photos": [],
         "zoom": 12,
         "center": {
            lat: -9.598392783313042,
            lng: -35.73571500947498
         }
      });
      getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive)).catch(() => alertRedir());
      listProjects();
      alert('Projeto criado com sucesso.');
   }else alert('Este projeto já existe.');
}
function removePhoto(photoId){
   if(!confirm('Tem certeza que deseja apagar essa foto?')) return;
   let photo = getPhoto(photoId); 
   if(typeof photo !== 'undefined'){
      if(photo.connections.length > 0){
         alert('Desfaça as conexões antes de remover esta foto.');
         return;
      }
      getToken().then(t => {
         deletePhoto(t, photoId).then(r => {
            if(r === true){
               project.photos.splice(photoIndex(photoId), 1);
               updateFile(t, JSON.stringify(db), db.idOnDrive);
               removeMarker(photoId);
               alert('Foto removida com sucesso.');
            }
         }).catch(e => alert(`A foto foi encontrada mas ocorreu um erro ao tentar apagar. ${e}`));
      }).catch(() => alertRedir());
   }else alert('A foto não foi encontrada. Verifique se o ID da foto e nome do projeto estão corretos.');
}
function renamePhoto(photoId){
   let newName = prompt('Escolha um nome para a foto.');
   if(newName === null) return;
   newName = newName.trim();
   if(newName.length == 0){
      alert('O nome precisa ter pelo menos 1 caractere.');
      return;
   }
   let photo = getPhoto(photoId);
   if(typeof photo !== 'undefined'){
      photo.name = newName;
      renameMarker(photoId, newName);
      getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive).then(r => {
         alert('Foto renomeada com sucesso.');
      })).catch(() => alertRedir());
   }else alert('Verifique se o ID da foto e nome do projeto estão corretos.');
}
function addConnection(photoId1, photoId2){
   let photo1 = getPhoto(photoId1); 
   let photo2 = getPhoto(photoId2);
   if(typeof photo1 !== 'undefined' && typeof photo2 !== 'undefined'){
      getToken().then(t => {
         if(photo1.connections.indexOf(photoId2) == -1){
            photo1.connections.push(photoId2);
            updateConnections(t, photoId1, photo1.connections).then(v => {
               addLine(...photo1.latLng, photoId1, photoId2);
               alert('Conexão criada com sucesso.');
            }).catch(e => {
               photo1.connections.pop();
               $(photoId1).checked = false;
               alert(`${e} Aguarde 1 minuto e tente novamente.`);
            });
         }
         if(photo2.connections.indexOf(photoId1) == -1){
            photo2.connections.push(photoId1);
            updateConnections(t, photoId2, photo2.connections).then(v => {
               addLine(...photo2.latLng, photoId1, photoId2);
               getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive)).catch(() => alertRedir());
            }).catch(e => {
               photo2.connections.pop();
            });
         }
      }).catch(() => alertRedir());
   }else alert('Algo não foi encontrado. Verifique se as informações estão corretas.');
}
function removeConnection(photoId1, photoId2){
   let photo1 = getPhoto(photoId1); 
   let photo2 = getPhoto(photoId2);
   if(typeof photo1 !== 'undefined' && typeof photo2 !== 'undefined'){
      getToken().then(t => {
         let found;
         if((found = photo1.connections.indexOf(photoId2)) >= 0){
            photo1.connections.splice(found, 1);
            updateConnections(t, photoId1, photo1.connections).then(r => {
               alert('Conexão removida com sucesso.');
            }).catch(e => alert(`Ocorreu um erro ao atualizar as conexões. ${e}`));
         }
         if((found = photo2.connections.indexOf(photoId1)) >= 0){
            photo2.connections.splice(found, 1);
            updateConnections(t, photoId2, photo2.connections).then(r => {
               getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive)).catch(() => alertRedir());
            }).catch(e => alert(`Ocorreu um erro ao atualizar as conexões. ${e}`));
         }
      }).catch(() => alertRedir());
      removeLine(photoId1, photoId2);
   }else alert('Algo não foi encontrado. Verifique se as informações estão corretas.');
}
function removeProject(name){
   let i = projectIndex(name);
   if(i >= 0){
      if(db.projects[i].photos.length > 0){
         alert('Não é permitido apagar projetos que possuem fotos. Remova todas as fotos antes.');
      }else{
         if(window.confirm('Você tem certeza que quer deletar o projeto?')){
            db.projects.splice(i, 1);
            getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive)).catch(() => alertRedir());
            listProjects();
            alert('Projeto apagado com sucesso');
         }
      }
   }
}
function renameProject(currentName){
   let newName = prompt('Escolha um nome para o projeto.');
   if(newName === null) return;
   newName = newName.trim();
   if(newName.length == 0){
      alert('O nome precisa ter pelo menos 1 caractere.');
      return;
   }
   let i = projectIndex(currentName);
   if(i >= 0){
      db.projects[i].name = newName;
      getToken().then(t => updateFile(t, JSON.stringify(db), db.idOnDrive)).catch(() => alertRedir());
      listProjects();
      alert('Projeto renomeado com sucesso.');
   }else alert('Este projeto não existe.');
}