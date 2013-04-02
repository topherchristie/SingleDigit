define(['text!templates/table.html'],function(template){
    var ScoreView = Backbone.View.extend({
        tagName:'tr',
        className:'',
        template: _.template(template),
        events:{
            
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
          
        },
        render: function(){
            var $el = $(this.el);
         //   $el.data('scoreId', this.model.get('_id'));
            var html =this.template(this.model.toJSON());
         
            $el.html(html);
               $el.addClass(this.model.get("className"));
           /* $el.find("td.courseName").each(function(e){
               var html = e.html();
               console.log("content html");
            });*/
            return this;
        }
        
    });
    return ScoreView;
});