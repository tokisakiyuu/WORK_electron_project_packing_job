
// import React, { PureComponent } from "react";
// import ReactCrop from "react-image-crop";
// import "react-image-crop/dist/ReactCrop.css";

// import "./App.css";

// export class ReactCropComponet extends PureComponent {
//   state = {
//     src: null,
//     crop: {
//       aspect: 1,
//       width: 50,
//       x: 0,
//       y: 0
//     }
//   };

//   onSelectFile = (e:any) => {
//     if (e.target.files && e.target.files.length > 0) {
//       const reader = new FileReader();
//       reader.addEventListener("load", () =>
//         this.setState({ src: reader.result })
//       );
//       console.log(reader.result);
//       reader.readAsDataURL(e.target.files[0]);
//     }
//   };

//   onImageLoaded = (image:any, pixelCrop:any) => {
//     this.imageRef = image;
//   };

//   onCropComplete = (crop:any, pixelCrop:any) => {
//     this.makeClientCrop(crop, pixelCrop);
//   };

//   onCropChange = (crop:any) => {
//     this.setState({ crop });
//   };

//   async makeClientCrop(crop:any, pixelCrop:any) {
//     if (this.imageRef && crop.width && crop.height) {
//       const croppedImageUrl = await this.getCroppedImg(
//         this.imageRef,
//         pixelCrop,
//         "newFile.jpeg"
//       );
//       this.setState({ croppedImageUrl });
//     }
//   }

//   getCroppedImg(image:any, pixelCrop:any, fileName:string) {
//     const canvas = document.createElement("canvas");
//     canvas.width = pixelCrop.width;
//     canvas.height = pixelCrop.height;
//     const ctx = canvas.getContext("2d");

//     ctx&&ctx.drawImage(
//       image,
//       pixelCrop.x,
//       pixelCrop.y,
//       pixelCrop.width,
//       pixelCrop.height,
//       0,
//       0,
//       pixelCrop.width,
//       pixelCrop.height
//     );

//     return new Promise((resolve, reject) => {
//       canvas.toBlob((blob:any) => {
//         if (!blob) {
//           //reject(new Error('Canvas is empty'));
//           console.error("Canvas is empty");
//           return;
//         }
//         blob.name = fileName;
//         window.URL.revokeObjectURL(this.fileUrl);
//         this.fileUrl = window.URL.createObjectURL(blob);
//         resolve(this.fileUrl);
//       }, "image/jpeg");
//     });
//   }

//   render() {
//     const { crop, croppedImageUrl, src } = this.state;

//     return (
//       <div className="App">
//         <div>
//           <input type="file" onChange={this.onSelectFile} />
//         </div>
//         {src && (
//           <ReactCrop
//             src={src}
//             crop={crop}
//             onImageLoaded={this.onImageLoaded}
//             onComplete={this.onCropComplete}
//             onChange={this.onCropChange}
//           />
//         )}
//         {croppedImageUrl && (
//           <img alt="Crop" style={{ maxWidth: "100%" }} src={croppedImageUrl} />
//         )}
//       </div>
//     );
//   }
// }