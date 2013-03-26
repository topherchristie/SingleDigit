var config = exports;
if(process.env.GOOGLE_CLIENT_ID){
  require('./web.config').configure(config);
  config.isProd = true;
}else{
  require('./test.config').configure(config); //this is not stored in git view example.config to setup your own
  config.isProd = false;
}

