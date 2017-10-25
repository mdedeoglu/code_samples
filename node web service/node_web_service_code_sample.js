var express         = require('express');
var Q               = require('q');
var favicon         = require('serve-favicon');
var path            = require('path');
var passport        = require('passport');
var bodyParser      = require('body-parser');
var config          = require('./libs/config');
var log             = require('./libs/log')(module);
var oauth2          = require('./libs/oauth2');
var ArticleModel    = require('./libs/mongoose').ArticleModel;
var data_gunlukverilerModel    = require('./libs/mongoose').data_gunlukverilerModel;
var data_gunlukverilerortalamaModel    = require('./libs/mongoose').data_gunlukverilerortalamaModel;
var CityModel        = require('./libs/mongoose').CityModel;
var customerModel    = require('./libs/mongoose').customerModel;
var publisherModel    = require('./libs/mongoose').publisherModel;
var lessonModel    = require('./libs/mongoose').lessonModel;
var konuModel    = require('./libs/mongoose').konuModel;
var UserModel    = require('./libs/mongoose').UserModel;
var questionModel    = require('./libs/mongoose').questionModel;
//var answerModel    = require('./libs/mongoose').answerModel;
//var solutionModel    = require('./libs/mongoose').solutionModel;

var aws              = require('aws-sdk');
var multer           = require('multer');
var multerS3         = require('multer-s3');
var uuid             = require('node-uuid');

aws.config.update({
    secretAccessKey: 'xxx',
    accessKeyId: 'xxx',
    region: 'xxx'
});
s3 = new aws.S3();

var app = express();

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(passport.initialize());



// Cors 
app.use(function(req, res, next) {
  res.status(200);
  res.header("Access-Control-Allow-Origin","*");
  res.header("Access-Control-Allow-Headers","Access-Control-Allow-Origin, X-HTTP-Method-Override, Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods","POST, GET, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Credentials", true);
  next();
}).options('*', function(req, res, next){
  res.end();
});



// aws publisher upload
var publisherupload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'kpss',  
        acl: 'public-read',
        key: function (req, file, cb) {
            //console.log(file);
            cb(null, 'yayincilar/'+uuid.v4()+'.jpg'); 
        }
    })
}).array('upl',1);







// publisher delete 
function publisherdelete(filename) {

    var params = {
      Bucket: 'kpss', 
      Key: filename          
  };

  s3.deleteObject(params, function(err, data) {
    if (err) console.log(err)     
        else console.log("Successfully deleted file");   
});

}

// publisher kayit
app.post('/api/publisher/:id', function (req, res, next) {

    var id =  req.params.id;
    var eskilogourl = "";
    //console.log(id);
    if (id=="0") {

        publisherupload(req,res,function(err) {
            if(err) {
                return res.send(err.message);
                console.log(err);  
            }

            console.log(req.files[0]);
            var publisher = new publisherModel({

                publisherName: req.body.publisherName,
                publisherLogo: req.files[0].key        
            });

            publisher.save(function (err) {
                if (!err) {
                    log.info("publisher eklendi");
                    return res.send({ status: 'OK',  dosya:req.files[0] });
                } else {
                    console.log(err);           
                    log.error('Internal error(%d): %s',res.statusCode,err.message);
                }
            });

        });
    }
    else {
        publisherModel.find({'_id': id}).find(function (err, publisher) {
            if (!err) {
                eskilogourl = publisher[0].publisherLogo;        


            } else {
                res.statusCode = 500;
                log.error('Internal error(%d): %s',res.statusCode,err.message);
                
            }
        });

        
        publisherupload(req,res,function(err) {
            if(err) {
                return res.send(err.message);
                console.log(err);  
            }



            console.log(req.files[0]);
            var publisher1 = new publisherModel({
                publisherName: req.body.publisherName,
                publisherLogo: req.files[0].key        
            });


            publisherModel.findById(req.params.id, function (err, publisher) {
                if (!err) {

                    publisher.publisherName = publisher1.publisherName;
                    publisher.publisherLogo = publisher1.publisherLogo;
                    publisher.save(function (err) {
                        if (!err) {
                            log.info("publisher eklendi");
                            publisherdelete(eskilogourl);
                            return res.send({ status: 'OK',  dosya:req.files[0] });
                        } else {
                            console.log(err);           
                            log.error('Internal error(%d): %s',res.statusCode,err.message);
                        }
                    });


                } else {
                    console.log(err);           
                    log.error('Internal error(%d): %s',res.statusCode,err.message);
                }
            });
        }); 

        
    }
});



// publisher güncelleme
app.put('/api/publisher/:id', passport.authenticate('bearer', { session: false }), function (req, res, next) {

    var id =  req.params.id;
    var eskilogourl = "";
    publisherModel.find({'_id': id}).find(function (err, publisher) {
        if (!err) {
            eskilogourl = publisher[0].publisherLogo;        


        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            //return res.send({ error: 'Server error' });
        }
    });


    publisherupload(req,res,function(err) {
        if(err) {
            return res.send(err.message);
            console.log(err);  
        }
        
        console.log(req.files[0]);
        var publisher = new publisherModel({

            publisherName: req.body.publisherName,
            publisherLogo: req.files[0].key        
        });


        publisher.findOneAndUpdate({_id:req.params.id}, function (err, publisher) {
            if (!err) {
                log.info("publisher updated");
                publisherdelete(eskilogourl);
                return res.send({ status: 'OK',  dosya:req.files[0] });
            } else {
                console.log(err);           
                log.error('Internal error(%d): %s',res.statusCode,err.message);
            }
        });

    });
});



// publisher listesi
app.get('/api/publisher', passport.authenticate('bearer', { session: false }), function (req, res, next) {

    return publisherModel.find(function (err, publisher) {
        if (!err) {
            return res.send(publisher);
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});


// publisher çağırma
app.get('/api/publisher/:id', passport.authenticate('bearer', { session: false }), function (req, res, next) {

    var id =  req.params.id;

    return publisherModel.find({'_id': id}).find(function (err, publisher) {
        if (!err) {
            return res.send(publisher);
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});

// publisher silme
app.delete('/api/publisher/:id', passport.authenticate('bearer', { session: false }), function (req, res, next) {

    var id =  req.params.id;

    publisherModel.find({'_id': id}).find(function (err, publisher) {
        if (!err) {
            console.log(publisher[0].publisherLogo);
            publisherdelete(publisher[0].publisherLogo);

        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            //return res.send({ error: 'Server error' });
        }
    });

    return publisherModel.findByIdAndRemove(id, function (err, publisher) {
        if (!err) {

            return res.send({status: 'OK'});
        } else {

            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});


// ders çağırma 
app.get('/api/lesson/:id', passport.authenticate('bearer', { session: false }), function (req, res, next) {

    var id =  parseInt(req.params.id);


    return lessonModel.find({'derskodu': id}).find(function (err, lesson) {
        if (!err) {
           // console.log(lesson);
            return res.send(lesson);
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});



// soru dosyası upload
var questionupload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'kpss',  
        acl: 'public-read',
        key: function (req, file, cb) {
          //  console.log(file);
            cb(null, 'sorular/'+uuid.v4()+'.jpg'); 
        }
    })
}).array('sorufile',1);

// cevap dosyası upload
var answerupload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'kpss',  
        acl: 'public-read',
        key: function (req, file, cb) {
            console.log("---------------");
            console.log(file);
            cb(null, 'cevaplar/'+uuid.v4()+'.jpg'); 
        }
    })
}).array('cevaplar',5);


// çözüm dosyası upload
var solutionupload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'kpss',  
        acl: 'public-read',
        key: function (req, file, cb) {
            //console.log(file);
            cb(null, 'cozumler/'+uuid.v4()+'.jpg'); 
        }
    })
}).array('cozumler',5);


// soru dosyası silme
function questiondelete(filename) {

    var params = {
      Bucket: 'kpss', 
      Key: filename          
  };

  s3.deleteObject(params, function(err, data) {
    if (err) console.log(err)     
        else console.log("Successfully deleted file");   
});
}





// soru ekleme
app.post('/api/question/:id',  function (req, res, next) {

    var id =  req.params.id;
    var eskisoruurl = "";
    if (id=="0") {
     
        questionupload(req,res,function(err) {
            if(err) {
                return res.send(err.message);
                console.log(err);  
            }

     
            var question = new questionModel({            
                derskodu:  req.body.selectders,
                konukodu:  req.body.selectkonu,
                soruzorluk:req.body.selectzorluk,
                soruturu:  req.body.selectsoruturu,
                yayinci:   req.body.selectyayinci,
                dogrucevap:req.body.dogrucevap,
                sorugorsel: req.body.sorugorsel,                
                cevapgorsel: req.body.cevapgorsel,
                cozumgorsel: req.body.cozumgorsel,
                cozumacik: req.body.cozumacik,
                sorutext:  req.body.sorutext,
                cevaptext1:  req.body.cevaptext1,
                cevaptext2:  req.body.cevaptext2,
                cevaptext3:  req.body.cevaptext3,
                cevaptext4:  req.body.cevaptext4,
                cevaptext5:  req.body.cevaptext5,
                cozumtext1:  req.body.cozumtext1,
                cozumtext2:  req.body.cozumtext2,
                cozumtext3:  req.body.cozumtext3,
                cozumtext4:  req.body.cozumtext4,
                cozumtext5:  req.body.cozumtext5              
            });
   
            if (req.files[0] != undefined) {
               question.soruurl=  req.files[0].key;
           }
           question.save(function (err) {
            if (!err) {
                log.info("question eklendi");
                return res.send({ status: 'OK',  id:question.id });
            } else {
                console.log(err);           
                log.error('Internal error(%d): %s',res.statusCode,err.message);
            }
        });

       });
    }
    else {

        var alink1,alink2,alink3,alink4,alink5 ="";
        var blink1,blink2,blink3,blink4,blink5 ="";


        questionModel.find({'_id': id}).find(function (err, question) {
            if (!err) {

                if (question[0].sorugorsel == true){
                    eskisoruurl = question[0].soruurl;
                    if (eskisoruurl!="") questiondelete(eskisoruurl);
                }

                if (question[0].cevapgorsel == true){
                    alink1 = question[0].cevapfile1;
                    alink2 = question[0].cevapfile2;
                    alink3 = question[0].cevapfile3;
                    alink4 = question[0].cevapfile4;
                    alink5 = question[0].cevapfile5;
                    if (alink1!="") questiondelete(alink1);
                    if (alink2!="") questiondelete(alink2);
                    if (alink3!="") questiondelete(alink3);
                    if (alink4!="") questiondelete(alink4);
                    if (alink5!="") questiondelete(alink5); 
                }   
                if (question[0].cozumgorsel == true){
                    blink1 = question[0].cozumfile1;
                    blink2 = question[0].cozumfile2;
                    blink3 = question[0].cozumfile3;
                    blink4 = question[0].cozumfile4;
                    blink5 = question[0].cozumfile5;

                    if (blink1!="") questiondelete(blink1);
                    if (blink2!="") questiondelete(blink2);
                    if (blink3!="") questiondelete(blink3);
                    if (blink4!="") questiondelete(blink4);
                    if (blink5!="") questiondelete(blink5);     
                }

            } else {
                res.statusCode = 500;
                log.error('Internal error(%d): %s',res.statusCode,err.message);                
            }
        });

        
        questionupload(req,res,function(err) {
            if(err) {
                return res.send(err.message);
                console.log(err);  
            }

            var question1 = new questionModel({            
                derskodu:  req.body.selectders,
                konukodu:  req.body.selectkonu,
                soruzorluk:req.body.selectzorluk,
                soruturu:  req.body.selectsoruturu,
                yayinci:   req.body.selectyayinci,
                dogrucevap:req.body.dogrucevap,
                sorugorsel: req.body.sorugorsel,                
                cevapgorsel: req.body.cevapgorsel,
                cozumgorsel: req.body.cozumgorsel,
                cozumacik: req.body.cozumacik,
                sorutext:  req.body.sorutext,       
                cevaptext1:  req.body.cevaptext1,
                cevaptext2:  req.body.cevaptext2,
                cevaptext3:  req.body.cevaptext3,
                cevaptext4:  req.body.cevaptext4,
                cevaptext5:  req.body.cevaptext5,
                cozumtext1:  req.body.cozumtext1,
                cozumtext2:  req.body.cozumtext2,
                cozumtext3:  req.body.cozumtext3,
                cozumtext4:  req.body.cozumtext4,
                cozumtext5:  req.body.cozumtext5        
            });
            if (req.files[0] != undefined) {
               question1.soruurl=  req.files[0].key;
           }

           questionModel.findById(req.params.id, function (err, question) {
            if (!err) {

                question.derskodu=   question1.derskodu;
                question.konukodu=   question1.konukodu;
                question.soruzorluk= question1.soruzorluk;
                question.soruturu=   question1.soruturu;
                question.yayinci=    question1.yayinci;
                question.dogrucevap= question1.dogrucevap;
                question.sorutext=   question1.sorutext;
                question.sorugorsel= question1.sorugorsel;         
                question.cevapgorsel=question1.cevapgorsel;
                question.cozumgorsel=question1.cozumgorsel;                
                question.cozumacik =question1.cozumacik;                
                question.cevaptext1=question1.cevaptext1;
                question.cevaptext2=question1.cevaptext2;
                question.cevaptext3=question1.cevaptext3;
                question.cevaptext4=question1.cevaptext4;
                question.cevaptext5=question1.cevaptext5;
                question.cozumtext1=question1.cozumtext1;
                question.cozumtext2=question1.cozumtext2;
                question.cozumtext3=question1.cozumtext3;
                question.cozumtext4=question1.cozumtext4;
                question.cozumtext5=question1.cozumtext5;

                /**if (question1.soruurl != "") {
                 question.soruurl=  question1.soruurl;
             }*/

             question.save(function (err) {
                if (!err) {
                    log.info("question update");
                   /* if (question.sorugorsel == true){
                        questiondelete(eskisoruurl);
                    } */                
                    return res.send({ status: 'OK',  id:question.id});
                } else {
                    console.log(err);           
                    log.error('Internal error(%d): %s',res.statusCode,err.message);
                }
            });


         } else {
            console.log(err);           
            log.error('Internal error(%d): %s',res.statusCode,err.message);
        }
    });
       });         
    }
});


// cevap ekleme
app.post('/api/answer/:id',  function (req, res, next) {
   var id =  req.params.id;
   var link1,link2,link3,link4,link5 ="";

   questionModel.find({'_id': id}).find(function (err,question) {
    if (!err) {
        if (question[0].cevapgorsel == true){
            link1 = question[0].cevapfile1;
            link2 = question[0].cevapfile2;
            link3 = question[0].cevapfile3;
            link4 = question[0].cevapfile4;
            link5 = question[0].cevapfile5;
            console.log("silme");
            if (link1!="") questiondelete(link1);
            if (link2!="") questiondelete(link2);
            if (link3!="") questiondelete(link3);
            if (link4!="") questiondelete(link4);
            if (link5!="") questiondelete(link5);                
        }
    } else {
        console.log(err);
        res.statusCode = 500;
        log.error('Internal error(%d): %s',res.statusCode,err.message);                
    }
});

  answerupload(req,res,function(err) {
    if(err) {
        return res.send(err.message);
        console.log(err);  
    }

    var question1 = new questionModel();       
    console.log("cevap link update");
    console.log(req.files[0].key);
    console.log(req.files[1].key);
    console.log(req.files[2].key);
    console.log(req.files[3].key);
    console.log(req.files[4].key);

    if (req.files[0] != undefined) {
        question1.cevapfile1 = req.files[0].key;
        question1.cevapfile2 = req.files[1].key;
        question1.cevapfile3 = req.files[2].key;
        question1.cevapfile4 = req.files[3].key;
        question1.cevapfile5 = req.files[4].key;            
    }
    questionModel.findById(req.params.id, function (err, question) {
        if (!err) {              

            question.cevapfile1=question1.cevapfile1;
            question.cevapfile2=question1.cevapfile2;
            question.cevapfile3=question1.cevapfile3;
            question.cevapfile4=question1.cevapfile4;
            question.cevapfile5=question1.cevapfile5;

            question.save(function (err) {
                if (!err) {
                    log.info("cevaplar update");

                    return res.send({ status: 'OK',  dosya:req.files });
                } else {
                    console.log(err);           
                    log.error('Internal error(%d): %s',res.statusCode,err.message);
                }
            });


        } else {
            console.log(err);           
            log.error('Internal error(%d): %s',res.statusCode,err.message);
        }
    });
});         

});

// çözüm ekleme
app.post('/api/solution/:id',  function (req, res, next) {
   var id =  req.params.id;
   var link1,link2,link3,link4,link5 ="";

   questionModel.find({'_id': id}).find(function (err,question) {
    if (!err) {
        if (question[0].cozumgorsel == true){
            link1 = question[0].cozumfile1;
            link2 = question[0].cozumfile2;
            link3 = question[0].cozumfile3;
            link4 = question[0].cozumfile4;
            link5 = question[0].cozumfile5;

            if (link1!="") questiondelete(link1);
            if (link2!="") questiondelete(link2);
            if (link3!="") questiondelete(link3);
            if (link4!="") questiondelete(link4);
            if (link5!="") questiondelete(link5);                

        }
    } else {
        res.statusCode = 500;
        log.error('Internal error(%d): %s',res.statusCode,err.message);                
    }
});


   solutionupload(req,res,function(err) {
    if(err) {
        return res.send(err.message);
        console.log(err);  
    }

    var question1 = new questionModel(); 

    if (req.files[0] != undefined) {
        question1.cozumfile1 = req.files[0].key;
        question1.cozumfile2 = req.files[1].key;
        question1.cozumfile3 = req.files[2].key;
        question1.cozumfile4 = req.files[3].key;
        question1.cozumfile5 = req.files[4].key;            
    }
    questionModel.findById(req.params.id, function (err, question) {
        if (!err) {              

            question.cozumfile1=question1.cozumfile1;
            question.cozumfile2=question1.cozumfile2;
            question.cozumfile3=question1.cozumfile3;
            question.cozumfile4=question1.cozumfile4;
            question.cozumfile5=question1.cozumfile5;

            question.save(function (err) {
                if (!err) {
                    log.info("cozumler update");

                    return res.send({ status: 'OK',  dosya:req.files });
                } else {
                    console.log(err);           
                    log.error('Internal error(%d): %s',res.statusCode,err.message);
                }
            });


        } else {
            console.log(err);           
            log.error('Internal error(%d): %s',res.statusCode,err.message);
        }
    });
});         

});



app.get('/api/question', passport.authenticate('bearer', { session: false }), function (req, res, next) {

    return questionModel.find(function (err, question) {
        if (!err) {
            return res.send(question);
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});

app.get('/api/question/:id', passport.authenticate('bearer', { session: false }), function (req, res, next) {

    var id =  req.params.id;
    if (id!=0) {
        return questionModel.find({'derskodu': id}).find(function (err, question) {
            if (!err) {
                return res.send(question);
            } else {
                res.statusCode = 500;
                log.error('Internal error(%d): %s',res.statusCode,err.message);
                return res.send({ error: 'Server error' });
            }
        });
    }else {
     return questionModel.find(function (err, question) {
        if (!err) {

            return res.send(question);
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
 }
});

app.get('/api/questionedit/:id', passport.authenticate('bearer', { session: false }), function (req, res, next) {

    var id =  req.params.id;

    return questionModel.find({'_id': id}).find(function (err, question) {
        if (!err) {
            return res.send(question);
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});

app.delete('/api/question/:id', passport.authenticate('bearer', { session: false }), function (req, res, next) {

    var id =  req.params.id;
    var alink1,alink2,alink3,alink4,alink5 ="";
    var blink1,blink2,blink3,blink4,blink5 ="";
    var eskisoruurl ="";


    questionModel.find({'_id': id}).find(function (err, question) {
        if (!err) {

            if (question[0].sorugorsel == true){
                eskisoruurl = question[0].soruurl;
                if (eskisoruurl!="") questiondelete(eskisoruurl);
            }

            if (question[0].cevapgorsel == true){
                alink1 = question[0].cevapfile1;
                alink2 = question[0].cevapfile2;
                alink3 = question[0].cevapfile3;
                alink4 = question[0].cevapfile4;
                alink5 = question[0].cevapfile5;
                if (alink1!="") questiondelete(alink1);
                if (alink2!="") questiondelete(alink2);
                if (alink3!="") questiondelete(alink3);
                if (alink4!="") questiondelete(alink4);
                if (alink5!="") questiondelete(alink5); 
            }   
            if (question[0].cozumgorsel == true){
                blink1 = question[0].cozumfile1;
                blink2 = question[0].cozumfile2;
                blink3 = question[0].cozumfile3;
                blink4 = question[0].cozumfile4;
                blink5 = question[0].cozumfile5;

                if (blink1!="") questiondelete(blink1);
                if (blink2!="") questiondelete(blink2);
                if (blink3!="") questiondelete(blink3);
                if (blink4!="") questiondelete(blink4);
                if (blink5!="") questiondelete(blink5);     
            }


        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            //return res.send({ error: 'Server error' });
        }
    });

    return questionModel.findByIdAndRemove(id, function (err, question) {
        if (!err) {

            return res.send({status: 'OK'});
        } else {

            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});



app.post('/oauth/token', oauth2.token);

app.get('/api/userInfo', passport.authenticate('bearer', { session: false }), function(req, res) {

    res.json({ user_id: req.user.userId, name: req.user.username, tenantId: req.user.tenantId,  scope: req.authInfo.scope })
}
);


app.get('/api/usertip/:username',  function(req, res) {

    var username =  req.params.username;

    return UserModel.find({'username': username}).find(function (err, User) {
        if (!err) {
            return res.send(User);
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s',res.statusCode,err.message);
            return res.send({ error: 'Server error' });
        }
    });
});


app.get('/ErrorExample', function(req, res, next){
    next(new Error('Random error!'));
});

app.use(express.static(path.join(__dirname, "public")));

require('./libs/auth');

app.use(function(req, res, next){
    res.status(404);
    log.debug('Not found URL: %s',req.url);
    res.send({ error: 'Not found' });
    return;
});

app.use(function(err, req, res, next){
    res.status(err.status || 500);
    log.error('Internal error(%d): %s',res.statusCode,err.message);
    res.send({ error: err.message });
    return;
});

app.listen(config.get('port'), function(){
    log.info('Express server listening on port ' + config.get('port'));
});

