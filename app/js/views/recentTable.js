define(['views/scoreTableItem','fixedColumns'],function(ScoreTableItemView){
    var RecentView = Backbone.View.extend({
        el: '#recentTable',  
        events:{
        
        },
        initialize: function(){
           //  this.collection.on('add', this.render, this);
        },
        render:function(){
            console.log("rendering: score table view");
            var self = this;
            self.$el.empty();
            this.collection.last20().forEach(function(score){
              var item = new ScoreTableItemView({model:score});
               self.$el.append(item.render().el);
            });
            
           var oTable =  self.$el.parent().dataTable({
                "iDisplayLength":25,
                "sScrollY": 200,
        "sScrollX": "100%",
        "sScrollXInner": "110%"
                
                
            });
            new FixedColumns(oTable);
            return this;
        }
    });
    return RecentView;
});