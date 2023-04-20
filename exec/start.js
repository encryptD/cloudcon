const CloudConvert = require('cloudconvert');
const ccn_key = require('../ccn_key/api_key.json');
const host   = process.env.host || 'localhost';
const port   = process.env.port || '3001';
const express    = require('express');
const fileUpload = require('express-fileupload');
var fileb64 = require('file-base64');
var fs = require('fs');
var path = require('path');

var path2html = path.join(__dirname,'..','index.html');
var path2tx =path.join(__dirname,'..','views','index.pug');

const app = express();
app.use(fileUpload());
app.set('views','../views');
app.set('view engine','pug');
app.listen(port, () => {
    console.log(`app listening at http://${host}:${port}/uploader`)
  });
  const cloudConvert = new CloudConvert(ccn_key.key);
  app.get('/uploader',(req,res) => {
    res.sendFile(path2html);
  }); 
  app.post('/upload',(req,res) => {
    //  res.sendFile(path2html);  
    var file = req.files.filename;
    var fCont;
    var myPath = __dirname+'/files/'+file;
    console.log(myPath);
    file.mv(myPath,(err)=>{
        if(err){
            return res.status(500).send(err);
        }
    });
    var mimeTyp = req.files.filename.mimetype; 
    let promise = new Promise((resolve,reject)=>{
        fileb64.encode(myPath,(err, base64String)=>{
            console.log(base64String);
            resolve(base64String);

        });
    });
    const conv = () =>{
        promise.then(
            (result)=>{
                console.log(result);
                let startOp = async (result) => {
                    let job =  await cloudConvert.jobs.create({"tasks": {
                        "import-1": {
                            "operation": "import/base64",
                            "file": result,
                            "filename": "test.png"
                        },
                        "task-1": {
                            "operation": "convert",
                            "input_format": "png",
                            "output_format": "pdf",
                            "engine": "imagemagick",
                            "input": [
                                "import-1"
                            ],
                            "fit": "max",
                            "strip": false
                        },
                        "export-1": {
                            "operation": "export/url",
                            "input": [
                                "task-1"
                            ],
                            "inline": false,
                            "archive_multiple_files": false
                        }
                    },
                    "tag": "jobbuilder"});
                    console.log('JOB ID:'+job.id);
                    job = await cloudConvert.jobs.wait(job.id);
                    let fileUrl = cloudConvert.jobs.getExportUrls(job)[0];
                    let redURL = fileUrl.url;
                    console.log(fileUrl);

                    res.render(path2tx,{title:'Download File',redURL:redURL});
                }    
                startOp(result);
                //return result;

            })
    }
    console.log(conv());
    console.log('Mime type::'+req.files.filename.mimetype); 
    //console.log('Fcont'+fCont);
  //startOp();
  });
  