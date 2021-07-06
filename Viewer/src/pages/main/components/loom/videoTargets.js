export default function setupVideoTargets(src){

  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  function processImage(img){
    console.log(img);
  }

  async function drawFrame(e){
    this.pause();

    console.log(this.currentTime/this.duration);
    /* ctx.drawImage(video, 0, 0);
    canvas.toBlob(processImage, 'image/png'); */
    
    if(this.currentTime < this.duration)  
      await this.play();
  }

  function onend(e){
    console.log('finished processing images')
    URL.revokeObjectURL(this.src);
  }

    video.addEventListener('loadedmetadata', function(){
      canvas.width = this.videoWidth
      canvas.height = this.videoHeight;
    }, false);
    video.addEventListener('timeupdate', drawFrame, false);
    video.addEventListener('ended', onend, false);
    video.muted = true;
    video.preload = 'auto';
    video.src = src;
    //video.playbackRate = 10;
    video.play();

  

  return [];
}