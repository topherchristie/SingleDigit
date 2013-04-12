
var vows = require("vows");
var should = require('should');

var TeeRoute = require('../routes/tee');

vows.describe('Tee Route Tests').addBatch({
    'constructor tests':{
        topic: function(){
           return new TeeRoute();
        },
        'returns object':function(topic){
          should.exist(topic);
          topic.should.be.instanceOf(Object);
        },
        'returns teeRoute object':function(topic){
          should.exist(topic);
          topic.should.be.instanceOf(TeeRoute);
        }
    }
}).export(module);