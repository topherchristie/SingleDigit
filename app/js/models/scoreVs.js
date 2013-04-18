define([],function(){
    var ScoreVs = Backbone.Model.extend({
        url:'stats/scoreVs/??',
        initialize:function(){   
        },
        
        sync : function(method, model,options){
          options = options || {};
          options.url = "/stats/scoresVs/" + this.get('stat');
          console.log('syncing', this.get('stat'));
          Backbone.sync(method,model,options);
        }
    });
    return ScoreVs;
});