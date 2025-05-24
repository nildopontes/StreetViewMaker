/*
MIT License

Copyright (c) 2019 Archilogic AG

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

SOURCE: https://github.com/archilogic-com/xmp-editor/blob/master/src/js/xmp-api.js
*/

const XMP_HEADER = 'http://ns.adobe.com/xap/1.0/\x00';
const XMP_END_META = '</x:xmpmeta>';

const JPG_SEGMENT_MARKER_LENGTH = 4;
const JPG_FILE_MARKER = [0xFF, 0xD8];
const JPG_APP1_MARKER = [0xFF, 0xE1];

function jpgReadXmp(buffer){
  const {markerOffset, segmentLength} = jpgFindXmpSegment(buffer);
  if(!markerOffset){
    return null;
  }else{
    const arr = new Uint8Array(buffer);
    return getStrFromUint8(arr, markerOffset + JPG_SEGMENT_MARKER_LENGTH + XMP_HEADER.length, segmentLength - JPG_SEGMENT_MARKER_LENGTH - XMP_HEADER.length);
  }
}

function jpgWriteXmp(buffer, xmpString){
  // check if JPG file buffer already contains an XMP segment
  let { markerOffset, segmentLength } = jpgFindXmpSegment(buffer);
  // insert at existing XMP segment offset or right after file start marker
  markerOffset = markerOffset || JPG_FILE_MARKER.length;
  const oldSegmentLength = segmentLength || 0;
  const newSegmentLength = jpgGetXmpSegmentLength(xmpString, false, false);
  const odlArr = new Uint8Array(buffer);
  const newArr = new Uint8Array(odlArr.length - oldSegmentLength + newSegmentLength);
  // write file part before XMP segment
  copyArr(newArr, 0, odlArr, 0, markerOffset);
  // insert XMP segment
  jpgWriteXmpSegment(newArr, markerOffset, xmpString);
  // file part after XMP segment 
  copyArr(newArr, markerOffset + newSegmentLength, odlArr, markerOffset + oldSegmentLength);
  return newArr.buffer;
}

function jpgWriteXmpSegment(arr, position, xmpString){
  const dv = new DataView(arr.buffer);
  copyArr(arr, position, JPG_APP1_MARKER);
  dv.setUint16(position + JPG_APP1_MARKER.length, jpgGetXmpSegmentLength(xmpString, false, true));
  writeStrToUint8(arr, position + JPG_SEGMENT_MARKER_LENGTH, XMP_HEADER);
  writeStrToUint8(arr, position + JPG_SEGMENT_MARKER_LENGTH + XMP_HEADER.length, xmpString);
}

function jpgGetXmpSegmentLength(xmpString, truncate, withoutMarker){
  let length = JPG_SEGMENT_MARKER_LENGTH + XMP_HEADER.length;
  if(!truncate){
    // Full APP1 XMP segment length, including closing XMP packet tag.
    length += xmpString.length;
  }else{
    // Truncated APP1 XMP segment length, ending after closing XMP meta tag, omitting closing XMP packet tag.
    // Mimicking Photoshop behavior which might be related to extended XMP spreading over multiple APP1 segments (?).
    length += xmpString.indexOf(XMP_END_META) + XMP_END_META.length;
  }
  if(withoutMarker) length -= JPG_APP1_MARKER.length;
  return length;
}

function jpgFindXmpSegment(buffer){
  const arr = new Uint8Array(buffer);
  let markerOffset;
  let segmentLength;
  for(let offset = 0; offset < arr.length; offset++){
    if(!markerOffset){
       //Find APP1 XMP segment marker
      if(arr[offset] === 0xFF && arr[offset+1] === 0xE1 && getStrFromUint8(arr, offset+4, XMP_HEADER.length) === XMP_HEADER){
         markerOffset = offset;
      }//Find XMP segment end
    }else if(!segmentLength && arr[offset] === 0x3C && arr[offset+1] === 0x2F && arr[offset+2] == 0x78){ // ascii char: '</x'
      if(getStrFromUint8(arr, offset, XMP_END_META.length) === XMP_END_META){
        segmentLength = offset + XMP_END_META.length - markerOffset;
        break;
      }
    }
  }
  return {markerOffset, segmentLength};
}

function copyArr(targetArr, targetPos, sourceArr, sourcePos, sourceLen){
  if (!sourcePos) sourcePos = 0;
  if (!sourceLen) sourceLen = sourceArr.length - sourcePos;
  for (let i = 0; i < sourceLen; i++) targetArr[targetPos+i] = sourceArr[sourcePos+i];
}

function getStrFromUint8(arrUint8, start, length){
  let out = '';
  for(let n = start; n < start+length; n++){
      out += String.fromCharCode(arrUint8[n]);
  }
  return out;
}

function writeStrToUint8(arrUint8, start, str) {
  for(let i=0, l=str.length; i<l; ++i){
    arrUint8[start+i]=str.charCodeAt(i);
  }
}

function createNewXmp(){
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