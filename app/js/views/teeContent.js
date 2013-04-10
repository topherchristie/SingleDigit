define(['text!templates/teeContent.html'],function(template){
    var TeeView = Backbone.View.extend({
        tagName:'div',
        className:'tab-pane tee',
        //el:'tttt' /function(){ return "Tee" + this.model.get("_id"); },
        template: Handlebars.compile(template),
        events:{
           // "click a.showStats":"showStats"
        },
        initialize:function(){
            this.model.on('change',this.render, this);
            this.model.on('destroy',this.remove, this);
        },
        render: function(){
            var $el = $(this.el);
            var html =this.template(this.model.toJSON());
            $el.html(html);
            $el.attr("id","Tee" + this.model.get("_id"));
            return this;
        }
    });
    return TeeView;
});