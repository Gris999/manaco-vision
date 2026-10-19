const tf=require('@tensorflow/tfjs-node'), mobilenet=require('@tensorflow-models/mobilenet'), fs=require('fs'), path=require('path');
const P=process.argv[2], A=path.join(P,'dataset','aumentado');
(async()=>{
  const CACHE=path.join(P,'modelo','emb_cache.json'), CBIN=path.join(P,'modelo','emb_cache.bin');
  let clases, X={tr:[],va:[]}, Y={tr:[],va:[]};
  if(fs.existsSync(CACHE)&&!process.env.REEMB){
    const meta=JSON.parse(fs.readFileSync(CACHE)); clases=meta.clases; const buf=fs.readFileSync(CBIN);
    const all=new Float32Array(buf.buffer,buf.byteOffset,buf.byteLength/4); const D=meta.dim; let k=0;
    for(const [sp,ys] of [["tr",meta.ytr],["va",meta.yva]]) for(const y of ys){X[sp].push(tf.tensor1d(all.subarray(k*D,(k+1)*D))); Y[sp].push(y); k++;}
    console.log('cache',Y.tr.length,Y.va.length);
  } else {
  const net=await mobilenet.load({version:2,alpha:1.0});
  clases=fs.readdirSync(A).filter(d=>fs.statSync(path.join(A,d)).isDirectory()).sort();
  const origs=Object.fromEntries(clases.map(c=>[c,fs.existsSync(path.join(P,'dataset','originales',c))?fs.readdirSync(path.join(P,'dataset','originales',c)).sort():[]]));
  for(const [ci,c] of clases.entries()){
    const holdStem = origs[c].length>=3 ? origs[c][origs[c].length-1].replace('.jpg','')+'_' : null;
    const files=fs.readdirSync(path.join(A,c)).filter(f=>f.endsWith('.jpg'));
    files.forEach((f,i)=>{
      const img=tf.node.decodeImage(fs.readFileSync(path.join(A,c,f)),3);
      const emb=tf.tidy(()=>net.infer(img,true).squeeze()); img.dispose();
      const isVal = process.env.SPLIT==='angulo' ? (holdStem ? f.startsWith(holdStem) : i%5===0) : (i%5===0);
      (isVal?X.va:X.tr).push(emb); (isVal?Y.va:Y.tr).push(ci);
    });
    console.log('emb',c,files.length);
  }
    const D=X.tr[0].shape[0], all=new Float32Array((X.tr.length+X.va.length)*D); let k=0;
    for(const t of [...X.tr,...X.va]){all.set(t.dataSync(),k*D); k++;}
    fs.mkdirSync(path.join(P,'modelo'),{recursive:true});
    fs.writeFileSync(CBIN,Buffer.from(all.buffer)); fs.writeFileSync(CACHE,JSON.stringify({clases,dim:D,ytr:Y.tr,yva:Y.va}));
  }
  if(process.env.FULL){X.tr=X.tr.concat(X.va); Y.tr=Y.tr.concat(Y.va);}
  const xs=tf.stack(X.tr), ys=tf.oneHot(tf.tensor1d(Y.tr,'int32'),clases.length);
  const xv=tf.stack(X.va), yv=tf.oneHot(tf.tensor1d(Y.va,'int32'),clases.length);
  const m=tf.sequential({layers:[
    tf.layers.dropout({inputShape:[xs.shape[1]],rate:+(process.env.DIN||0.1)}),
    tf.layers.dense({units:+(process.env.UNITS||512),activation:'relu',kernelRegularizer:tf.regularizers.l2({l2:+(process.env.L2||1e-4)})}),
    tf.layers.dropout({rate:+(process.env.DH||0.3)}),
    tf.layers.dense({units:clases.length,activation:'softmax'})]});
  m.compile({optimizer:tf.train.adam(1e-3),loss:'categoricalCrossentropy',metrics:['accuracy']});
  const h=await m.fit(xs,ys,{epochs:+(process.env.EP||60),batchSize:128,shuffle:true,validationData:[xv,yv],verbose:0,
    callbacks:{onEpochEnd:(e,l)=>{if(e%10===9)console.log(`epoca ${e+1} acc=${l.acc.toFixed(3)} val_acc=${l.val_acc.toFixed(3)}`)}}});
  const pv=m.predict(xv), pred=pv.argMax(-1).arraySync(), real=Y.va;
  const top3=tf.topk(pv,3).indices.arraySync(); const t3=real.filter((r,i)=>top3[i].includes(r)).length/real.length;
  console.log('TOP1',(real.filter((r,i)=>pred[i]===r).length/real.length).toFixed(3),'TOP3',t3.toFixed(3));
  const cm=clases.map(()=>clases.map(()=>0)); real.forEach((r,i)=>cm[r][pred[i]]++);
  const rep=clases.map((c,i)=>({clase:c,aciertos:cm[i][i],total:cm[i].reduce((a,b)=>a+b,0)}));
  if(clases.length<30) console.table(rep);
  const out=path.join(P,'app','modelo'); fs.mkdirSync(out,{recursive:true});
  await m.save('file://'+out);
  fs.writeFileSync(path.join(out,'clases.json'),JSON.stringify(clases));
  fs.writeFileSync(path.join(P,'modelo','metricas.json'),JSON.stringify({train:Y.tr.length,val:Y.va.length,
    val_acc:h.history.val_acc.at(-1),top3:t3,acc:h.history.acc.at(-1),por_clase:rep,matriz:cm,clases},null,1));
})();
