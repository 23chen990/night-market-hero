declare const MATERIAL_DATA: Record<string, string>;
interface Window {
 previewReady: boolean;
 previewInfo: {worldWidth:number;worldHeight:number;cameraX:number;maxCameraX:number;completePanoramaInputs:number;sceneLayers:string[];playing:boolean;view:number[];runtimeIntegrated:boolean};
 exportPreview:(x?:number,w?:number,h?:number,layer?:string)=>string;
 exportWorld:()=>string;
}
