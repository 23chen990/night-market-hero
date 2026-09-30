declare const MATERIAL_DATA: Record<string, string>;
interface Window {
  previewReady:boolean;
  previewInfo:{worldSize:number[];mode:string;materialIds:string[];placements:Array<{id:string;x:number;y:number;w:number;h:number;flip:boolean;role:string}>;selectedMaterial:string|null;selectionCount:number;showGaps:boolean;completePanoramaInputs:number;codeComplexFacades:boolean;runtimeIntegrated:boolean};
  exportPreview:()=>string;
  exportSky:()=>string;
}
