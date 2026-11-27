import { Document, Packer, Paragraph, TextRun, BorderStyle, AlignmentType, LevelFormat } from 'docx'
export interface CvData { nombre:string; cargos:string[]; phone:string; email:string; linkedin:string; keywords:string; cvText:string }
const FONT='Calibri',CLR_BLUE='1F3864',CLR_GRAY='444444',CLR_BLK='000000'
const SZ_NAME=32,SZ_CARGO=22,SZ_CONT=19,SZ_SECT=22,SZ_BODY=21
const MARGIN_TB=720,MARGIN_LR=900,PAGE_W=12240,PAGE_H=15840
export function cleanAiText(raw:string):string{return(raw||'').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1').replace(/^#{1,4}\s*/gm,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').replace(/\n{3,}/g,'\n\n').trim()}
function sp(b=0,a=0){return{spacing:{before:b,after:a}}}
function sectionHeader(text:string):Paragraph{return new Paragraph({children:[new TextRun({text:text.toUpperCase().replace(/[:]/g,'').trim(),font:FONT,size:SZ_SECT,bold:true,color:CLR_BLUE})],border:{bottom:{style:BorderStyle.SINGLE,size:6,color:CLR_GRAY,space:2}},...sp(240,100)})}
function bulletPara(text:string):Paragraph{const clean=text.replace(/^[-–—\u2022\u25B8\u25CF●•]\s*/,'').replace(/^\d+[.)]\s*/,'').trim();return new Paragraph({children:[new TextRun({text:clean,font:FONT,size:SZ_BODY,color:CLR_BLK})],numbering:{reference:'ats-bullets',level:0},alignment:AlignmentType.JUSTIFIED,...sp(30,30)})}
const SECT_KW=['RESUMEN','PERFIL','EJECUTIVO','EXPERIENCIA','EDUCACI','FORMACI','COMPETENCIA','HABILIDAD','PALABRA','CLAVE','IDIOMA','TECNOLOG','INFORMACI','ADICIONAL','CERTIFICACI']
const COMP_KW=['COMPETENCIA','HABILIDAD','PALABRA','CLAVE']
function isSection(l:string):boolean{if(l.length>90)return false;const up=l.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g,'').trim();return SECT_KW.some(k=>up.startsWith(k)||up.includes(k))}
function isCompSection(l:string):boolean{const up=l.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ ]/g,'').trim();return COMP_KW.some(k=>up.includes(k))}
function isBullet(l:string):boolean{return/^[-–—\u2022\u25B8\u25CF●•]\s/.test(l)||/^\d+[.)]\s/.test(l)}
function isJobTitle(l:string):boolean{return/[–\-—].*(20\d{2}|19\d{2}|actualidad|presente)/i.test(l)&&!isBullet(l)&&l.length<130}
function isEdu(l:string):boolean{return/Maestr|Licenci|Bach|Ingeni|Tecnic|Diploma|Certif|MBA/i.test(l)&&/20\d{2}|19\d{2}/.test(l)&&l.length<160}
function isInst(l:string):boolean{return/Universidad|Instituto|Escuela|College|PUCP|UPC|USMP|USIL|ESAN|UTEC|PAD|CENTRUM/i.test(l)&&l.length<130}
function isKeywordsCorrido(l:string):boolean{return(l.match(/[·,|]/g)||[]).length>=3&&l.length<500&&!isBullet(l)}
export async function generateCvDocx(data:CvData):Promise<Buffer>{
  const{nombre,cargos,phone,email,linkedin,cvText}=data;const children:Paragraph[]=[]
  children.push(new Paragraph({children:[new TextRun({text:(nombre||'').toUpperCase(),font:FONT,size:SZ_NAME,bold:true,color:CLR_BLUE})],alignment:AlignmentType.CENTER,...sp(0,60)}))
  const tl=(Array.isArray(cargos)?cargos:[]).map(c=>c.trim()).filter(Boolean).join('  |  ')
  if(tl)children.push(new Paragraph({children:[new TextRun({text:tl,font:FONT,size:SZ_CARGO,bold:true,color:CLR_BLK})],alignment:AlignmentType.CENTER,...sp(0,40)}))
  const ct=[phone,email,linkedin].filter(Boolean)
  if(ct.length)children.push(new Paragraph({children:[new TextRun({text:ct.join('  ·  '),font:FONT,size:SZ_CONT,color:CLR_GRAY})],alignment:AlignmentType.CENTER,...sp(0,40)}))
  children.push(new Paragraph({children:[new TextRun({text:'',size:SZ_CONT})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:CLR_BLUE,space:4}},...sp(0,120)}))
  const clean=cleanAiText(cvText);const nameCmp=(nombre||'').toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g,'')
  function isHdr(line:string):boolean{const up=line.toUpperCase().replace(/\s+/g,' ').trim();if(up.replace(/[^A-Z]/g,'')===nameCmp)return true;if(up===tl.toUpperCase().trim())return true;if(ct.some(c=>line.trim()===c.trim()))return true;return false}
  let inComp=false;const compBuf:string[]=[]
  function flushComp(){if(!compBuf.length)return;children.push(new Paragraph({children:[new TextRun({text:compBuf.join('  ·  '),font:FONT,size:SZ_BODY,color:CLR_BLK})],alignment:AlignmentType.JUSTIFIED,...sp(40,80)}));compBuf.length=0;inComp=false}
  for(const raw of clean.split('\n')){const line=raw.trim();if(!line)continue;if(isHdr(line))continue
    if(isSection(line)){if(inComp)flushComp();children.push(sectionHeader(line));inComp=isCompSection(line);continue}
    if(inComp){if(isKeywordsCorrido(line))compBuf.push(...line.split(/\s*[·,|]\s*/).map(x=>x.trim()).filter(Boolean));else if(isBullet(line)){const t=line.replace(/^[-–—\u2022\u25B8\u25CF●•]\s*/,'').replace(/^\d+[.)]\s*/,'').trim();if(t)compBuf.push(t)}else if(line.length<80&&!isJobTitle(line)&&!isEdu(line))compBuf.push(line);else{flushComp();children.push(new Paragraph({children:[new TextRun({text:line,font:FONT,size:SZ_BODY,color:CLR_BLK})],alignment:AlignmentType.JUSTIFIED,...sp(30,30)}))}continue}
    if(isKeywordsCorrido(line)){children.push(new Paragraph({children:[new TextRun({text:line,font:FONT,size:SZ_BODY,color:CLR_BLK})],alignment:AlignmentType.JUSTIFIED,...sp(30,60)}));continue}
    if(isJobTitle(line)){children.push(new Paragraph({children:[new TextRun({text:line,font:FONT,size:SZ_BODY,bold:true,color:CLR_BLUE})],...sp(160,0)}));continue}
    if(isEdu(line)){children.push(new Paragraph({children:[new TextRun({text:line,font:FONT,size:SZ_BODY,bold:true,color:CLR_BLUE})],...sp(120,0)}));continue}
    if(isInst(line)){children.push(new Paragraph({children:[new TextRun({text:line,font:FONT,size:SZ_BODY,color:CLR_BLK})],alignment:AlignmentType.JUSTIFIED,...sp(0,40)}));continue}
    if(isBullet(line)){children.push(bulletPara(line));continue}
    if(line.trim())children.push(new Paragraph({children:[new TextRun({text:line,font:FONT,size:SZ_BODY,color:CLR_BLK})],alignment:AlignmentType.JUSTIFIED,...sp(40,40)}))
  }
  if(inComp)flushComp()
  const doc=new Document({numbering:{config:[{reference:'ats-bullets',levels:[{level:0,format:LevelFormat.BULLET,text:'–',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:360,hanging:360},spacing:{before:30,after:30}},run:{font:FONT,size:SZ_BODY,color:CLR_BLK}}}]}]},styles:{default:{document:{run:{font:FONT,size:SZ_BODY,color:CLR_BLK}}}},sections:[{properties:{page:{size:{width:PAGE_W,height:PAGE_H},margin:{top:MARGIN_TB,right:MARGIN_LR,bottom:MARGIN_TB,left:MARGIN_LR}}},children}]})
  return Packer.toBuffer(doc)
}
export async function generateCvPdf(data:CvData):Promise<Buffer>{
  const PDFDocument=(await import('pdfkit')).default
  const{nombre,cargos,phone,email,linkedin,cvText}=data
  return new Promise((resolve,reject)=>{
    const chunks:Buffer[]=[];const doc=new PDFDocument({margin:36,size:'LETTER'})
    doc.on('data',(c:Buffer)=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject)
    const ML=45,MR=doc.page.width-45,W=MR-ML,BLUE='#1F3864',BLACK='#000000',GRAY='#444444'
    const newPage=()=>{if(doc.y>doc.page.height-72)doc.addPage()}
    const nome=nombre||''
    doc.font('Helvetica-Bold').fontSize(16).fillColor(BLUE).text((nome||'').toUpperCase(),ML,doc.y,{align:'center',width:W});doc.moveDown(0.2)
    const tl=(Array.isArray(cargos)?cargos:[]).map(c=>c.trim()).filter(Boolean).join('  |  ')
    if(tl){doc.font('Helvetica-Bold').fontSize(11).fillColor(BLACK).text(tl,ML,doc.y,{align:'center',width:W});doc.moveDown(0.15)}
    const ct=[phone,email,linkedin].filter(Boolean)
    if(ct.length){doc.font('Helvetica').fontSize(9.5).fillColor(GRAY).text(ct.join('   ·   '),ML,doc.y,{align:'center',width:W});doc.moveDown(0.15)}
    doc.moveTo(ML,doc.y).lineTo(MR,doc.y).lineWidth(1.2).strokeColor(BLUE).stroke();doc.moveDown(0.5)
    const clean=cleanAiText(cvText||'');const nameCmp=(nome).toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g,'')
    let inComp=false;const compBuf:string[]=[]
    function flushPdf(){if(!compBuf.length){inComp=false;return};const corrido=compBuf.join('  ·  ');newPage();doc.font('Helvetica').fontSize(10.5).fillColor(BLACK).text(corrido,ML,doc.y,{width:W,align:'justify',lineGap:2});doc.moveDown(0.35);compBuf.length=0;inComp=false}
    for(const raw of clean.split('\n')){const line=raw.trim();if(!line){doc.moveDown(0.15);continue};newPage()
      if(line.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g,'')===nameCmp)continue;if(line===tl)continue;if(ct.some(c=>line.trim()===c.trim()))continue
      if(isSection(line)){if(inComp)flushPdf();doc.moveDown(0.35);doc.font('Helvetica-Bold').fontSize(11).fillColor(BLUE).text(line.toUpperCase().replace(/[:]/g,'').trim(),ML,doc.y,{width:W});const ly=doc.y+2;doc.moveTo(ML,ly).lineTo(MR,ly).lineWidth(0.8).strokeColor(GRAY).stroke();doc.moveDown(0.3);inComp=isCompSection(line);continue}
      if(inComp){if(isKeywordsCorrido(line))compBuf.push(...line.split(/\s*[·,|]\s*/).map(x=>x.trim()).filter(Boolean));else if(isBullet(line)){const t=line.replace(/^[-–—\u2022\u25B8\u25CF●•]\s*/,'').replace(/^\d+[.)]\s*/,'').trim();if(t)compBuf.push(t)}else if(line.length<80&&!isJobTitle(line)&&!isEdu(line))compBuf.push(line);else{flushPdf();doc.font('Helvetica').fontSize(10.5).fillColor(BLACK).text(line,ML,doc.y,{width:W,align:'justify'});doc.moveDown(0.1)};continue}
      if(isJobTitle(line)){doc.moveDown(0.25);doc.font('Helvetica-Bold').fontSize(10.5).fillColor(BLUE).text(line,ML,doc.y,{width:W});doc.moveDown(0.05);continue}
      if(isEdu(line)){doc.moveDown(0.2);doc.font('Helvetica-Bold').fontSize(10.5).fillColor(BLUE).text(line,ML,doc.y,{width:W});doc.moveDown(0.05);continue}
      if(isInst(line)){doc.font('Helvetica').fontSize(10.5).fillColor(BLACK).text(line,ML,doc.y,{width:W});doc.moveDown(0.1);continue}
      if(isBullet(line)){const t=line.replace(/^[-–—\u2022\u25B8\u25CF●•]\s*/,'').replace(/^\d+[.)]\s*/,'').trim();doc.font('Helvetica').fontSize(10.5).fillColor(BLACK).text('–  '+t,ML+10,doc.y,{width:W-10,align:'justify',lineGap:2});doc.moveDown(0.12);continue}
      doc.font('Helvetica').fontSize(10.5).fillColor(BLACK).text(line,ML,doc.y,{width:W,align:'justify',lineGap:2});doc.moveDown(0.1)
    }
    if(inComp)flushPdf();doc.end()
  })
}
