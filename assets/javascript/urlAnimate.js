'use strict';


//let frames = ["🌍", "🌏", "🌎"];♧♤♣♥
//let frames = ['👾_____', '_👾___', '__👾___', '___👾__', '____👾_', '_____👾'];


let frames = ["■"];
let currentFrame = 0;
let direction = 1;
let maxSize = 15;

function AnimateUrl(){
    let getFrame = () => {
        let frame = "■"
        for (let i=0; i < currentFrame;i++){
            frame = frame.concat("■");
        }
        return frame;
    }
    location.hash = getFrame()
    currentFrame += direction;
    if (currentFrame >= maxSize){
        // go backward
        direction = -1;
    }
    if (currentFrame == 0) {
        // go forward
        direction = 1;
    }

    setTimeout(AnimateUrl, 50);
}

AnimateUrl();