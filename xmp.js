const XMP_HEADER = 'http://ns.adobe.com/xap/1.0/\x00';
const txtEnc = new TextEncoder();
const txtDec = new TextDecoder();

function readXMP(uint8arr){
  const {markerOffset, segmentLength} = findAPP1XMP(uint8arr);
  if(!markerOffset){
    return null;
  }else{
    return txtDec.decode(uint8arr.slice(markerOffset + 33, markerOffset + segmentLength));
  }
}
function setUint16(v){
   return [v >> 8 & 255, v & 255];
}
function getUint16(a, b){
   return (a << 8) + b;
}
function writeXMP(uint8arr, xmpString){
  let {markerOffset, segmentLength} = findAPP1XMP(uint8arr);
  markerOffset = markerOffset || 2;
  const oldSegmentLength = segmentLength || 0;
  const newSegmentLength = 33 + xmpString.length;
  const newArr = new Uint8Array(uint8arr.length - oldSegmentLength + newSegmentLength);
  newArr.set(uint8arr.slice(0, markerOffset));
  newArr.set([255, 225], markerOffset);
  newArr.set(setUint16(newSegmentLength - 2), markerOffset + 2);
  newArr.set(txtEnc.encode(XMP_HEADER), markerOffset + 4);
  newArr.set(txtEnc.encode(xmpString), markerOffset + 33);
  newArr.set(uint8arr.slice(markerOffset + oldSegmentLength), markerOffset + newSegmentLength);
  return newArr;
}
function findAPP1XMP(uint8arr){
  let markerOffset;
  let segmentLength; // APP1 length
  for(let i = 0; i < uint8arr.length; i++){
      if(getUint16(...uint8arr.slice(i, i + 2)) === 65505 && txtDec.decode(uint8arr.slice(i + 4, i + 33)) === XMP_HEADER){
         markerOffset = i;
         segmentLength = getUint16(...uint8arr.slice(i + 2, i + 4)) + 2;
         break;
      }
  }
  return {markerOffset, segmentLength};
}
function newXMP(){
   return `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Adobe XMP Core 5.1.0-jc003">
   <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description rdf:about="" xmlns:GPano="http://ns.google.com/photos/1.0/panorama/"
        GPano:UsePanoramaViewer="True"
        GPano:ProjectionType="equirectangular"
        GPano:PoseHeadingDegrees="350.0"
        GPano:CroppedAreaLeftPixels="0"
        GPano:CroppedAreaTopPixels="0"
        GPano:CroppedAreaImageWidthPixels="4000"
        GPano:CroppedAreaImageHeightPixels="2000"
        GPano:FullPanoWidthPixels="4000"
        GPano:FullPanoHeightPixels="2000"/>
   </rdf:RDF>
</x:xmpmeta>`;
}