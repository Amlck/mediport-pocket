const RELEASE = {"version":"pocket-public-e4ae9d3bdab0","builtAt":"2026-11-06T08:41:43.000Z","releaseNotes":{"date":"2026-11-06","label":"Mediport Pocket · public source release","changes":["Public self-contained source, tests and contribution guidelines are available on GitHub.","Verified public NTUH formulary pages may be linked as online sources; captured internal records remain excluded.","Install from a shared HTTPS link without Tailscale or an app store.","Calculators, portable guides, drug references and licensed POCUS teaching media download for offline use.","Hospital catalog records, saved local regimens and guides containing captured hospital material are omitted from this edition.","ECG illustrations without recorded reuse provenance are omitted; the text-based reading workflow remains available."]}};
const ASSETS = [{"path":"app.js","sha256":"4b1d483b7c94ec54e9d39445b0f73b6196afca6fecc58e66d21cddfa28c01959"},{"path":"calculators.css","sha256":"9b12d3e7277ca4e9c80cad7275cd74c4db3bfe88abd307613694fd4865234e81"},{"path":"data/reference.json","sha256":"e57a70365305122faa21571aeb689fa10fe0b1066cab23ef0a5b3a65f86d6cd1"},{"path":"drug-compare.css","sha256":"5846db6f1a6380b6de15c6f722d43018921dd9fabf7bcacefe1952af3fa1e889"},{"path":"drugs.css","sha256":"43db7e19e30754a19922cb627de9f8b43d51f522032be87d927a3e1c99fd043c"},{"path":"ekg.css","sha256":"38fa5368292d5142c3ba30d42d32410195bfece7563bcccd432623a966e15ffd"},{"path":"fluids.css","sha256":"26a79a9296909b42a6032da6cba5b9f8d2fd695a41b7c851dda5b3a1e2f9078a"},{"path":"guides.css","sha256":"ef89c0a11606f74464c7897dc0ae19117a43d8f74aab162cbc45444dbdc91f0e"},{"path":"icon-180.png","sha256":"3e41fad02da877bf0a2c956616237cc38fcdfbc179f6842e939ffad28cd00548"},{"path":"icon-192.png","sha256":"b74dfffed0d47f25ac60a229eee42feec32e4618f80f800c357876371cdd8626"},{"path":"icon-512.png","sha256":"8053c6a615ab57c950661593a7b890d83fec01f796b344f6bd492670d92853ad"},{"path":"icon.svg","sha256":"b7a300fc87fa4a955237303769edaa9f118da3fcf221b041c53d22a9c454d80a"},{"path":"images/pocus/aorta-aneurysm-thrombus.png","sha256":"11c1c3f4e36b13aec2ad9d50565ed9539f4956e38e1384d9741e881af621c11f"},{"path":"images/pocus/bile-duct-measurement.png","sha256":"1b79f2bdecdcf07f5cad6ba2a713f2dfb0eed90180a3211d8a54fc8b68179d0c"},{"path":"images/pocus/cardiac-ef-biplane.png","sha256":"58f97389ce23e845525449f46d4fbcdd71b2232903da176e6e241e04cc26d115"},{"path":"images/pocus/cardiac-tapse.png","sha256":"3e4f5746c0243d30ecd4ec7c4057a5d816ce22ef7b75babaa2f3cf72de714d52"},{"path":"images/pocus/gallbladder-acute-pattern.png","sha256":"8bd5385c3067d6880c1a2430a4795d16f5c92d4549b076d1f3d4fa80a6db6141"},{"path":"images/pocus/gallbladder-congestive-wall.png","sha256":"eb6732d0b06ffda0f8d98da0bbb29c9d33537e8edf3b7f75a20ce85890bedfa5"},{"path":"images/pocus/gallbladder-normal-wall.png","sha256":"c991c7769e3099dc4765d306a4b6491077247dea058faadf9b084a5323289d16"},{"path":"images/pocus/hepatic-normal.png","sha256":"641ecf143f23303c5f6cee883fc073519d5bf9a313ea4f446c75b40ba98ff416"},{"path":"images/pocus/hepatic-severe.png","sha256":"d64dfa2e7cb6cb43c86700c64def5c66d76b0d22a3603ec00d893bcae89c447a"},{"path":"images/pocus/intrarenal-normal.png","sha256":"441e0174e0806c7da23c228bc807b1f8b79592089eb01da8e33d2212d8923e85"},{"path":"images/pocus/intrarenal-severe.png","sha256":"6504bddc6154d4d3e056e3f7945434217583f63e4730050f33338ee7f5a430ee"},{"path":"images/pocus/ivc-m-mode.png","sha256":"9c34925f2688ffe1ac3e9cff5ea3ae3c6c466112d56dde138fafa86ca9837a22"},{"path":"images/pocus/ivc-respiration.png","sha256":"5942ed6ec7c83765ee564793b44baf69965b01d98f2dad7eff69ede1b8b07ed4"},{"path":"images/pocus/lung-a-lines.png","sha256":"4f015506e3ee2461b815c3ec3a349ddf3b8b70fbc2c5a6989a6d5374317217ea"},{"path":"images/pocus/lung-b-lines.png","sha256":"ec076de549d2785e59983ae68272b4f8357bb7bdf500cbddbb281a6ff8eb2365"},{"path":"images/pocus/lung-consolidation-hepatization.png","sha256":"d059319f313906ceb010c53f6399ab0c1c1ebae950587bd34a60f490d660dbfd"},{"path":"images/pocus/lung-point-respiratory.mp4","sha256":"fa629c81861e8c5439af7abf3bb92e2c4bc5efc4d38f55fcc601cfd9d44cc2e2"},{"path":"images/pocus/lung-point-respiratory.png","sha256":"cd80b6a6d9098dc6238727bf3fb4fcdab20a0e650fbbdbd273510c6197354ef3"},{"path":"images/pocus/lung-pulse-neonatal.mp4","sha256":"2e5562952c9a2cc2a88a51ea9e044c6e4e51d42e400b3fed492162f5afa4f357"},{"path":"images/pocus/lung-pulse-neonatal.png","sha256":"c9c8c9b21c7b4c5116c81ff5f311f9cceb7d61f31840d1152768e1e229d8a2e8"},{"path":"images/pocus/lung-shred-effusion.png","sha256":"1b3b8a5cef91612eb4fd33b2207a8c33a858bf561703c8a58277f09ef55e89c6"},{"path":"images/pocus/lung-sliding-normal.mp4","sha256":"3e3dd8ea686a85fcac513b88cb1b8ada9f8bf7156374c35866a7ffe43a777688"},{"path":"images/pocus/lung-sliding-normal.png","sha256":"20933b0c0efaa8d0d9f922bcb0e60dd3dd91810e3cb0c45f835dde46d62bba01"},{"path":"images/pocus/pleural-effusion-complex.png","sha256":"dfc5e79e2009f314c547cb134ff781cc2f0be6a871526583f65e24615c5d9b31"},{"path":"images/pocus/pleural-effusion-simple.png","sha256":"ef6e5603bc05e447ce2cc4cbdd35ae884604fdedee5a8321d4309f4a00d7292c"},{"path":"images/pocus/portal-normal.png","sha256":"a82e115bfeef1685ae6322aeebbd5812c1767eedd695f180674e086cd7ee2333"},{"path":"images/pocus/portal-severe.png","sha256":"66bf05cb5061030f7f848a2e8ab49e177a7a9ee763db3c7b31d081b58a090149"},{"path":"images/pocus/ptx-barcode-mmode.png","sha256":"ac92c7f2cab0dbdde992732761ac65e52a64e5131420b13b009965f8be6afe2d"},{"path":"images/pocus/ptx-lung-point-bmode.png","sha256":"16c327fb665298dbf66cc851211f81b7aad87e71770220cfcf443402449fd406"},{"path":"images/pocus/ptx-lung-point-mmode.png","sha256":"6e1fc6b982cb3f710e9773287a9ec95c44c4fd448d4bfbaf38a327fe62969945"},{"path":"images/pocus/ptx-seashore-mmode.png","sha256":"e7bbe386d508f68cb9f3a8af3468e263234cffba211cabc26a27d63484b8dfe8"},{"path":"images/pocus/renal-acute.png","sha256":"90ab4933a949bd3053e71eabd3faf038686173d5ef362a8fad641245acd5c8e9"},{"path":"images/pocus/renal-bright.png","sha256":"18f717bea025ac6bcd473fc1ad73b86f9e910ce1d8aaa5b2f6c2d89982c8bcbc"},{"path":"images/pocus/renal-chronic.png","sha256":"8b39b6345f772749cee916b923d5eb0f1745daa2b62572721d620a023289572f"},{"path":"images/pocus/renal-cyst.png","sha256":"01491fed4bb7188bdd7358ed9ff1ab2f2b139467c7ac01645dd94eef63acbc8f"},{"path":"images/pocus/renal-dilation.png","sha256":"423532fdba2ae2d1f57c48dddc110bc4146665e424f2bb05e915d049158669f7"},{"path":"images/pocus/renal-normal.png","sha256":"1b577ec26bb38a09931b50f40ac927f5e5267f51190e7f66d15d9ef0c05ce5b9"},{"path":"images/pocus/rush-aorta-aneurysm.png","sha256":"3f3651b8a6bf3a70c4af1416a9f609b36878fcb7f0a54d54ecf660a506ebad2c"},{"path":"images/pocus/rush-dvt-failed-compression-poster.png","sha256":"90080b80b770dc59d276e7c298a286daff30f3ba4f74d863a1ebfde25bb80ff0"},{"path":"images/pocus/rush-dvt-failed-compression.mp4","sha256":"08457efdd1cbb86748c85d89d3d346baa8002248ac8360c2009d4db4bd4c9328"},{"path":"images/pocus/rush-dvt-normal-compression-poster.png","sha256":"8dbeef0eb0914289133331fc9babfba95981e5bf2abe1abb481ddef72dd015ab"},{"path":"images/pocus/rush-dvt-normal-compression.mp4","sha256":"19714f6ebf65cc35d10100a9d82a068984b3c3ba4d99fae08d41bd2da4f13532"},{"path":"images/pocus/rush-dvt-probe-positions.png","sha256":"3cea0a6a8ea9dfafdacad090b7c160b38b8b74c2b42f8a12e9070f06037c21da"},{"path":"images/pocus/rush-dvt-proximal-map.png","sha256":"4c3850e9c9f8eea37b9468c4547f8097a92a059c3147bf64b87cd1a8e3c095a1"},{"path":"images/pocus/rush-fast-luq-splenorenal.png","sha256":"006325093b7dea68d2ee5a1af6cae81e2bdcb475e995f572673347e7e1163c1d"},{"path":"images/pocus/rush-fast-pelvic-fluid.png","sha256":"37607db63c4a86d8d991d4d9ed1522b1044ed755d9f2de05b9797725433c94d5"},{"path":"images/pocus/rush-fast-ruq-fluid.png","sha256":"1caf105e1631b4174bde7bd1a12e94fd188c04f0329c0147169c6798c0089d2a"},{"path":"images/pocus/rush-fast-views.png","sha256":"efae5023869b3dc662a7dfe75c6dee8933a1e8d850be29d521fbd0fe3deff051"},{"path":"images/pocus/rush-femoral-dvt.png","sha256":"082110115e2bd454c335ee2c3f8a8c652130a51089c1c0a1f31f1e8691cc3e88"},{"path":"images/pocus/rush-lv-paired.png","sha256":"5e95ec51539ca2a59b36a96aa9954451ee7afb53f82ba8eb6973559dad3d7ef3"},{"path":"images/pocus/rush-pericardial-effusion.png","sha256":"87faddc3e80f1a4ebd047c8fb4972b5ad1890a6a3dfafeb74a03cae144ba8a58"},{"path":"images/pocus/rush-rv-enlarged.png","sha256":"baeb24965459c5749122658c7f5c65f929adfb99fb6540842f1cec011d3e6030"},{"path":"images/pocus/sfu-grade-four.png","sha256":"ab493958e669bdca99f80aaae2474ccffd1442934ace43b29654945f02dbf00f"},{"path":"images/pocus/sfu-grade-one.png","sha256":"a3bf6dce1b555dd59b09ded38173bed0dc2341dbc36d27dd9f6747af004a09f3"},{"path":"images/pocus/sfu-grade-three.png","sha256":"4933ea7813b29a8ce88b52ef9f932e7f76cbe982b71ef0706d35d055d7aeb033"},{"path":"images/pocus/sfu-grade-two.png","sha256":"2e6cf6cb53f5719a4498db603c2040ff21057a52d4e5c2d053ed896143e203a2"},{"path":"images/pocus/sfu-scan-four.png","sha256":"f7c3cae020cdf7c740e44a536d8e4f04bfac8a800189c60c0b3ee1f8ea15323d"},{"path":"images/pocus/sfu-scan-one.png","sha256":"e8133acb1c51ee51ec373ae6ac20d2af0fa87fb07d8d35c0756b94837b290973"},{"path":"images/pocus/sfu-scan-three.png","sha256":"48f62647f8b0bfda243e5cb374e1c58e67891e3e57b7331fb52c2f9b9bafe664"},{"path":"images/pocus/sfu-scan-two.png","sha256":"ea72a9acf85c98be42949f4af94c725b08fc37ff436efbe65fbeb754241170c8"},{"path":"index.html","sha256":"11f6b8f0d95b54c15819fa54f06c672c7a2e62ceb43e1d06f5a04723e9660e90","downloadPath":"offline-shell.txt","contentType":"text/html; charset=utf-8"},{"path":"lab-review.css","sha256":"5f908cae2d2bb84b6952b5e9c5a335c71de87da1afdf8383ac480e5202b20130"},{"path":"lib/boot.js","sha256":"b42ac64e047be8ba5dab8bd1b33c2d8385c9762d569e3416f195fa55407b30f0"},{"path":"lib/drug-comparison.js","sha256":"c6e3f338477a7728be4800c7a63a0d2a74ade3e5ada24db4dfbc16a842fd18b0"},{"path":"lib/fluid-contents.js","sha256":"e4e284ee3f2c7f9a19ffa0381a77cb842a26869293df7304aba7ffc7709d68ef"},{"path":"lib/guide-dose-presentation.js","sha256":"f7402d0d094532aa4448f6472489cd4b58b3e64ff30116425e162517c7ad00a0"},{"path":"lib/guide-drug-links.js","sha256":"1acb0e4233d9b1ce920dbc021e404ebd88c9e3961de4789c42af22961bd31ac3"},{"path":"lib/lab-review-extra.js","sha256":"9e2832a08f4e26ad327f4226d84130e125acf1cd9f3d4e2e1fe763807f22804e"},{"path":"lib/lab-review.js","sha256":"51a2525e0cb36e6f41f1bd5cfa379b64fda350f9f73b805b95efac36bc7e8cda"},{"path":"lib/mark.js","sha256":"eaab45a44b116550ba0bc0f686522959644d9d54eae6f71a5d38a00e9146f24e"},{"path":"lib/offline.js","sha256":"ffb439a393548e0021888b8d91e8bc28297aa5cb90a76689ff0b6f907d1bbc9b"},{"path":"lib/pack-presentation.js","sha256":"c0dccd5373f374ac027f3321d74aa42a30f8de279981aeaed3f2e7ad2d17e5ad"},{"path":"lib/pocus-atlas.js","sha256":"fa8ec6c4b306ad1eb3bb11be0866707b7aca9b1b92b2011bc498d7567ff2f968"},{"path":"lib/reference-navigation.js","sha256":"3d6101f1d6b13d6f78ec3769d4562393de6dbd9022c82980f5cead3e63677e16"},{"path":"lib/search.js","sha256":"a19bcab823c933a3b0bbc7efda4d6e2e4090006524e26507f1247feca0261df0"},{"path":"lib/session.js","sha256":"7ce0a2018893bf5451c6a0f974382b2392a0630aa8f43fefebc426e1bf75dbcd"},{"path":"lib/source.js","sha256":"309d82b2e2a74ae1ebe770ab03a6f022e29e4367a85aca04b39258eae65d600f"},{"path":"lib/theme.js","sha256":"3b98edeb8f94423d7b2fe1ffac2540b3401128211443fd5e8c3a08990aaa7920"},{"path":"lib/ui.js","sha256":"347f9dcd223d4c5a697da3261c2392118084881cedf574fa7ec8323da3be5c16"},{"path":"manifest.webmanifest","sha256":"358649dd555240d5a9a6341f6841836081516ef4d576ed366503300cfb118d9a"},{"path":"offline-shell.txt","sha256":"11f6b8f0d95b54c15819fa54f06c672c7a2e62ceb43e1d06f5a04723e9660e90"},{"path":"pocus.css","sha256":"bc2f3be84d1d7357b25f87c026718d80244f0897e621ef1197e182e8f2671c94"},{"path":"refinement.css","sha256":"12c47dbb75b7746140bef8375e42b866877c5371a5acaa4b24d507d8eb797880"},{"path":"shared/abg.mjs","sha256":"6de96f81aafc8bbd986376b59fd077f00ef2d09461963c55db1adcec6ef638c9"},{"path":"shared/aki-composed.mjs","sha256":"a6105c0b5978c6bd1cf05e498a0e5892f537facd1383a6dfbdad2456a83094c9"},{"path":"shared/aki-engine.mjs","sha256":"b5751426b6b6b0eb46e67dc7db3686f7c71b4a80d35499350e35226c0ce97337"},{"path":"shared/aki-entry.mjs","sha256":"a69433614f105eb793a2fc42484e7d84c33a16798221e48c85d89f0d09e44f61"},{"path":"shared/calculators.mjs","sha256":"cedd5dd3047839e2ac0a2cda2378f0e70177ad7ecb1ba1521949c2f54c8d6aa2"},{"path":"shared/delirium-engine.mjs","sha256":"2a3c78d45e2febebfecc6c31c8db7d9240ed907e47e8d722b4732d40cbf27f09"},{"path":"shared/glycemic.mjs","sha256":"e2331363dece4e868924927eecc57b7b5cb48d75f11561c9c2dc26f9281bd8d2"},{"path":"shared/heart-failure-engine.mjs","sha256":"d7cf39520540e334f6734e94b879fc20a7b99121d7b352139045ceba89a9cb6d"},{"path":"shared/hyperkalemia-engine.mjs","sha256":"11f08161daec5ba4a12d3f32f01e3e933525bc5d3089d4a2414a74cae9229e34"},{"path":"shared/hypocalcemia-engine.mjs","sha256":"5a1f2cb1edb68b820007cd9c24690febc76979b2e2459f9e897d10891ae2848b"},{"path":"shared/hypoglycemia-engine.mjs","sha256":"7a3b1aa4e4ee2f7472512ad7e33192a47095d6a7f7f60c13b5dc0ee1f43c723d"},{"path":"shared/hypokalemia-engine.mjs","sha256":"8f74f7f15cbdcadda07dd31355b34b7bb5ce3847b463ea2357f7c4dbc53c568c"},{"path":"shared/hypotension-engine.mjs","sha256":"aa01f65f4d9b923bb28241c700e48e1a2136030ba03ae3ed2a0ab2132b83c363"},{"path":"shared/lab-review-entry.mjs","sha256":"467fa0967eaf61976cf2d66bb09163332d4a539ca69805ae6b36421ab4d7db0c"},{"path":"shared/new-inpatient-fever-engine.mjs","sha256":"9b34b028c16123794fda8f9a8064682f285a42ebde859dd7eda4c4cf2a2cacdf"},{"path":"shared/syncope-engine.mjs","sha256":"89e582211f14b1544e1e30fc8fb7e229e6713f12e5b654500ceca571b581855f"},{"path":"shared/tachycardia-engine.mjs","sha256":"48e190b8c9f6bdc9a2ba38983de9a70a238cc93a7701419f241a9972fa5ffd11"},{"path":"shared/transfusion-reaction-engine.mjs","sha256":"529382c96487334410b83027b7645e0eb399c0a08fdd9f26b4a2d96698a66c92"},{"path":"style.css","sha256":"155b22a2a5cd2124ceefe15f4b56ddf01a21e1f475b72277f9da7bab50091802"},{"path":"views/abg.js","sha256":"4d9f084710efbb4f3c26ef2e8694b7201e37e401ffcce01626a31f60768cf15e"},{"path":"views/calc-bedside.js","sha256":"0b98588bab023d97b4f32f9a32ebe4c99beadf1dff0388a6a24515503bc16dc4"},{"path":"views/calc-chem.js","sha256":"227d5f7f538df79a5bc78c4a90d45132bb9c0c145032cd001071289a4562e416"},{"path":"views/calc-heme.js","sha256":"b4eb43093d75028de6b2f89e3cd26ee71b217aeb3bd9fe3d22e3d70fe64b31cc"},{"path":"views/calc-kidney.js","sha256":"8edde1920141b24fbf428a656200c7f62b88eafc78d7d976cb5df1a000649285"},{"path":"views/calc-parts.js","sha256":"76474c3fbfb40778f21bef8e4eabdb2104fbb96262c3552581fa654d5f5bb662"},{"path":"views/calc-renal.js","sha256":"f48483a6d796482b6c3d36b2b5d936bfd3d7d24fa259894ad2ddeb3d8ed2b8b3"},{"path":"views/calc-scores.js","sha256":"68c9cdfab3aca8a622858d60cea4678fe4cfa9a4d443da2b0d415b294b7114d2"},{"path":"views/calc-steroid.js","sha256":"5c12e96fc18dc8bb155c1fa7facbb35a6f8ec377d9c6a061ee9321fe7a550206"},{"path":"views/calc-vitals.js","sha256":"20eccfcc9de32d704f2f602408007526494345ff5532fbbb373050fae3261fda"},{"path":"views/calculators.js","sha256":"a5c1e4283c92a95b1a123ede444d72bc20b8bb12ea39de00f0191438fd5e2d41"},{"path":"views/drug-compare.js","sha256":"9bbaa8dfde53546daacec0a216b07f54a09100ca23235f5e033724e3dfdfce42"},{"path":"views/drugs.js","sha256":"ff754a1a0801764e86be27eaca6d9116b7a92a723b0615c6250ebe503112b2f0"},{"path":"views/ekg.js","sha256":"06cf295b17a09d124586e85fbdb2a2b1b8fd7f4e6ee5e06eae3779ce7d7b8683"},{"path":"views/fluid-parts.js","sha256":"c248fa2d672331ce33d3e5bfb9be99c9c1820ce6260a7b032ac81295629b6cbd"},{"path":"views/fluids.js","sha256":"cafca2b8be319b77d6bda1a64724229d8e43c69bcc4d850d3ab9fb48c437b89d"},{"path":"views/guides.js","sha256":"fc3726e5ca81312efeec77a8e9a02023734e34b3b7701638c8c4b42e197e337f"},{"path":"views/home.js","sha256":"475a034ee4bd25b2b2fcda108a29540fe3bb6ad161916b2d35572bfb559f473b"},{"path":"views/install.js","sha256":"d80350b10a75c6062943acc29c44a85ff7bbc996724a9f99cab381eea7a36ed3"},{"path":"views/lab-review.js","sha256":"8d115a94e2fd9fbd7439d5977d8dfea7a4bec8bfb5aeeb42533c79292eb13dd5"},{"path":"views/pack.js","sha256":"fd162da937b0956db3c50361b157d5352ace1f2bd668041dd5f9dbb92b785cc4"},{"path":"views/pocus.js","sha256":"ae75dba5ba7985bae7a028460739c5eb959d4d749b770416155bad8fe3f667b5"},{"path":"views/search.js","sha256":"fbcd16b89496315d1f791ebb1135ad2b3c4c542840cf7c649c60e6f181709900"},{"path":"release.json","sha256":"ec3ff3330b81444bdf2f8aa52d3806970a905df5f0f0fd63c0e80d059accf7c7"}];
function parseByteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(size) || size < 1) return null;
  let start;
  let end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix < 1) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) return null;
    end = Math.min(end, size - 1);
  }
  return [start, end];
}
/* Generated release constants are prepended by build.mjs. No runtime caching. */
const BASE = new URL('./', self.location.href);
const PREFIX = 'mediport-pocket:' + BASE.pathname + ':';
const CACHE = PREFIX + RELEASE.version;
const allowed = new Map(ASSETS.map(asset => [new URL(asset.path, BASE).href, asset]));
const hex = buffer => Array.from(new Uint8Array(buffer), value => value.toString(16).padStart(2, '0')).join('');

async function downloadPack() {
    const cache = await caches.open(CACHE);
      for (const asset of ASSETS) {
        const url = new URL(asset.path, BASE).href;
        // Public hosting may canonicalize or inject scripts into HTML. Fetch
        // the declared exact shell bytes and retain the stable HTML cache key.
        const downloadUrl = new URL(asset.downloadPath || asset.path, BASE).href;
        const response = await fetch(downloadUrl, { cache: 'reload', credentials: 'omit', redirect: 'error' });
        if (!response.ok || response.type === 'opaque') throw new Error('Reference download failed');
        const digest = hex(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer()));
        if (digest !== asset.sha256) throw new Error('Reference version mismatch');
        if (asset.contentType) {
          const headers = new Headers(response.headers);
          headers.set('Content-Type', asset.contentType);
          // Fetch exposes decoded bytes; transport encoding/length no longer
          // describe this synthetic response. Preserve security headers.
          headers.delete('Content-Encoding');
          headers.delete('Content-Length');
          await cache.put(url, new Response(await response.arrayBuffer(), { status: response.status, headers }));
        } else await cache.put(url, response);
      }
}
async function cachedAssetMatches(cache, asset) {
  const response = await cache.match(new URL(asset.path, BASE).href);
  if (!response || response.type === 'opaque') return false;
  try {
    const digest = hex(await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer()));
    return digest === asset.sha256;
  } catch {
    return false;
  }
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      await downloadPack();
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  // A waiting worker reaches activation only after existing Pocket windows have
  // closed. Never clear caches belonging to another app or another scope.
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Chrome keeps the fragment on navigation requests; the hash router means
  // every reopen of "#/guides" would otherwise miss the allowlist.
  url.hash = '';
  if (url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  event.respondWith((async () => {
    if (request.method !== 'GET' || url.search) return new Response('Not part of the pocket reference bundle', { status: 404 });
    const key = url.href === BASE.href ? new URL('index.html', BASE).href : url.href;
    if (!allowed.has(key)) return new Response('Not part of the pocket reference bundle', { status: 404 });
    const cached = await (await caches.open(CACHE)).match(key);
    // Media seeks must stay within the verified full file, including offline.
    // Never fetch a partial response or add a runtime request to the cache.
    const rangeHeader = request.headers?.get('range');
    if (cached && key.endsWith('.mp4') && rangeHeader !== null && rangeHeader !== undefined) {
      const bytes = await cached.arrayBuffer();
      const range = parseByteRange(rangeHeader, bytes.byteLength);
      const headers = new Headers(cached.headers);
      headers.set('Accept-Ranges', 'bytes');
      if (!range) {
        headers.set('Content-Range', `bytes */${bytes.byteLength}`);
        headers.set('Content-Length', '0');
        return new Response(null, { status: 416, headers });
      }
      const [start, end] = range;
      headers.set('Content-Range', `bytes ${start}-${end}/${bytes.byteLength}`);
      headers.set('Content-Length', String(end - start + 1));
      return new Response(bytes.slice(start, end + 1), { status: 206, headers });
    }
    return cached || new Response('Reference download missing. Reconnect and repair the offline copy.', { status: 503 });
  })());
});
self.addEventListener('message', event => {
  const reply = value => event.ports[0]?.postMessage(value);
  if (event.data?.type === 'STATUS') {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      // Bound full-file reads: motion clips must not all be copied into memory
      // together on a phone just to report the installed pack's status.
      let complete = true;
      for (const asset of ASSETS) if (!await cachedAssetMatches(cache, asset)) { complete = false; break; }
      reply({ version: RELEASE.version, builtAt: RELEASE.builtAt, releaseNotes: RELEASE.releaseNotes,
        complete, assets: ASSETS.length });
    })());
  }
  if (event.data?.type === 'REPAIR') {
    event.waitUntil((async () => {
      try { await downloadPack(); reply({ ok: true }); }
      catch { reply({ ok: false, message: 'Could not repair this version. Reconnect and check for an update; retained files were preserved.' }); }
    })());
  }
});
