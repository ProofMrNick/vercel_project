
// THIS FILE HAS BEEN REWRITTEN SPECIFICALLY TO SATISFY APP HOSTING CONDITIONS ON VERCEL.COM 

var express = require('express');
var app = express();

const fs = require('fs');

const crypto = require("crypto-js");
const key = process.env['KEY'];

const path = require('path');
const git = require("isomorphic-git");
const http = require("isomorphic-git/http/node");

const dir = path.join('/tmp', 'dbase');
const DB_PATH = path.join('/tmp', 'database.json');

// add git and crypto
async function syncToGitHub() {
  try {
    const dirExists = fs.existsSync(dir);
    if (!dirExists) {
      await git.clone({ fs, http, dir, url: 'https://github.com/ProofMrNick/database.git' });
    } else {
      await git.pull({
        fs, http, url: 'https://github.com/ProofMrNick/database.git', dir: dir, ref: 'main',
        singleBranch: true,
        author: { email: 'server@authored', name: 'server' },
      });
    }

    const gitData = await fs.promises.readFile(path.join(dir, 'dbaseGIT.json'), 'utf8');
    const decryptedData = crypto.AES.decrypt(gitData, key).toString(crypto.enc.Utf8);
    await fs.promises.writeFile(DB_PATH, decryptedData);

  } catch(e) {
    console.error(e.stack);
  }
}

syncToGitHub();


async function pushToGithub() {
  try {
    const dirExists = fs.existsSync(dir);
    if (!dirExists) {
      await git.clone({ fs, http, dir, url: 'https://github.com/ProofMrNick/database.git' });
    } else {
      await git.pull({
        fs, 
        http, 
        url: 'https://github.com/ProofMrNick/database.git', 
        dir: dir, 
        ref: 'main',
        singleBranch: true,
        author: { email: 'server@authored', name: 'server' },
      });
    }

    const data = await fs.promises.readFile(DB_PATH, 'utf8');
    const encryptedData = crypto.AES.encrypt(data, key).toString();
    await fs.promises.writeFile(path.join(dir, 'dbaseGIT.json'), encryptedData);

    await git.add({ fs, dir: dir, filepath: 'dbaseGIT.json' });

    await git.commit({
      fs, dir: dir,
      author: { email: 'server@authored', name: 'server' },
      message: 'Changed synced file to Node side file.'
    });

    await git.push({
      fs, 
      http, 
      dir: dir, 
      remote: 'origin', 
      ref: 'main',
      onAuth: () => ({ username: process.env['TOKEN'], password: 'x-oauth-basic' }),
    });

    let qwe = await git.log({fs, dir, ref: 'main'});
    console.log(qwe);

  } catch (e) {
      console.error(e.stack);
  }
}



// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));

app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/css', express.static(path.join(process.cwd(), 'public/css')));
app.use('/js', express.static(path.join(process.cwd(), 'public/js')));
app.use('/img', express.static(path.join(process.cwd(), 'public/img')));


var readData = new Promise(function(resolve, reject) {
  fs.readFile(DB_PATH, 'utf8', (err, data) => {
    if (err) {
      reject(new Error(`Error reading file from disk: ${err}`))
    } else {
      resolve(JSON.parse(data));
    }
  })
});


var writeData = function(dataToWrite) {
  return new Promise(function(resolve, reject) {
    readData.then(function(data) {
      var key = dataToWrite.email;
      if (!(key in data)) {
        data[key] = dataToWrite;
        data = JSON.stringify(data);
        fs.writeFile(DB_PATH, data, 'utf8', err => {
          if (err) {
            reject(new Error(`Error while writing to file: ${err}`));
          } else {
            resolve("account created");
          }
        });
      } else {
        reject("user already exists")
      }
    }).catch(reject);
  })
} 



app.get('/', function(req, res) {
  res.render('pages/index');
});

app.get('/login', function(req, res) {
  res.render('pages/login');
});

app.get('/workshop', function(req, res) {
  res.render('pages/workshop', {
    data: JSON.stringify("new act")
  });
});

app.get('/preview', function(req, res) {
  res.render('pages/preview');
});


app.get('/:user_email_id', function(req, res) {
  fs.readFile(DB_PATH, 'utf8', (err, data) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    } else {
      var dbase = JSON.parse(data);
      if (req.params.user_email_id in dbase) {
        res.render('pages/account', {
          data: JSON.stringify(dbase[req.params.user_email_id])
        });
      } else {
        res.render('pages/404', {
          data: JSON.stringify("user not found")
        });
      }
    }
  })
});


function lookup(data, source, dup) { 
  var flag = false;
  for (var i = 0; i < data.length; i++) {
    if (data[i].id == source) {
      flag = true
      break
    } 
  }

  if (flag) {
    var articles = []
    var articlesDups = []
    for (var i = 0; i < data.length; i++) {
      if (data[i].id == source) {
        articles.push(data[i]);
        articlesDups.push(data[i].add_info.dup);
      }
    }
    var act = data.find((el) => 
      el.id == source && el.add_info.dup == dup
    );

    return [true, act, articles, articlesDups, data.indexOf(act)]
  } else {
    return [false]
  }
}


app.get('/:user_email_id/:id/:dup', function(req, res) {
  fs.readFile(DB_PATH, 'utf8', (err, data) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
  } else {
    var dbase = JSON.parse(data);
    if (req.params.user_email_id in dbase) {
      var call = lookup(dbase[req.params.user_email_id].actions, req.params.id, req.params.dup);
      if (call[0]) {
        dt = call[1];
        res.render('pages/act', {
          data: JSON.stringify(dt)
        });
      } else {
        res.render('pages/404', {
          data: JSON.stringify("action not found")
        });
      }
    } else {
      res.render('pages/404', {
        data: JSON.stringify("user not found")
      });
    }
    }
  })
});

app.get('/:user_email_id/:id/:dup/workshop', function(req, res) {
  fs.readFile(DB_PATH, 'utf8', (err, data) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
  } else {
    var dbase = JSON.parse(data);
    if (req.params.user_email_id in dbase) {
      var call = lookup(dbase[req.params.user_email_id].actions, req.params.id, req.params.dup);
      if (call[0] && call[1] !== undefined) {
        dt = call[1];
        res.render('pages/workshop', {
          data: JSON.stringify(dt)
        });
      } else {
        res.render('pages/404', {
          data: JSON.stringify("action not found")
        });
      }
    } else {
      res.render('pages/404', {
        data: JSON.stringify("user not found")
      });
    }
    }
  })
});


app.use(express.json());

app.post("/api", function(req, res) {
  console.log(req.body);
  if (req.body.do == "signup") {

    writeData(req.body.prov_data)
      .then(
        result => pushToGithub().then(() => {res.json('account created')}),
        error => res.json(error)
      );

  } else if (req.body.do == "login") {

    readData.then(function(dbase) {
      var key = req.body.prov_data.email;
      if (key in dbase && dbase[key].password == req.body.prov_data.password) {
        res.json({
          logged_in: true,
          email: key,
          name: dbase[key].name
        });
      } else {
        res.json("failed to login")
      }
    }).catch(() => res.json("failed to login"));

  } else if (req.body.do == "delete") {

    fs.readFile(DB_PATH, 'utf8', (error, data1) => {
      if (error) {
        res.json("failed to delete");
      } else {
        var dbase = JSON.parse(data1);
        var call = lookup(dbase[req.body.email_to_change].actions, req.body.id_to_change, req.body.dup_to_change);
        if (call[0] && call[1] !== undefined) {
          dbase[req.body.email_to_change].actions.splice(call[4], 1);
          fs.writeFile(DB_PATH, JSON.stringify(dbase, null, 4), err => {
            if (err) {
              res.json("failed to delete");
            } else {
              pushToGithub().then(() => {
                res.json("deleted successfully");
              });
            }
          });
        } else {
          res.json("failed to delete");
        }
      }
    }); 

  } else if (req.body.do == "update_action") {

    fs.readFile(DB_PATH, 'utf8', (error, data1) => {
      if (error) {
        res.json("failed to update action");
      } else {
        var dbase = JSON.parse(data1);
        var call = lookup(dbase[req.body.prov_data.author_email].actions, req.body.old_id, req.body.old_dup);
        var callNew = lookup(dbase[req.body.prov_data.author_email].actions, req.body.prov_data.id, req.body.prov_data.add_info.dup);
        if (call[0] && call[1] !== undefined) {
          var crrAct = call[1];
          crrAct.header = req.body.prov_data.header;
          crrAct.image = req.body.prov_data.image;
          crrAct.title = req.body.prov_data.title;
          crrAct.action_hidden = req.body.prov_data.action_hidden;
          crrAct.type = req.body.prov_data.type;
          crrAct.content = req.body.prov_data.content;
          if (callNew[0] && crrAct.id !== req.body.prov_data.id) {
            crrAct.add_info.dup = Math.max(...callNew[3]) + 1;
          }
          crrAct.id = req.body.prov_data.id;
          dbase[req.body.prov_data.author_email].actions[call[4]] = crrAct;
          fs.writeFile(DB_PATH, JSON.stringify(dbase, null, 4), err => {
            if (err) {
              res.json("failed to update action");
            } else {
              pushToGithub().then(() => {
                res.json("action updated successfully");
              });
            }
          });
        } else {
          res.json("failed to update action");
        }
      }
    }); 

  } else if (req.body.do == "create_action") {

    fs.readFile(DB_PATH, 'utf8', (error, data1) => {
      if (error) {
        res.json("failed to create action");
      } else {
        var dbase = JSON.parse(data1);
        var action = req.body.prov_data;
        var call = lookup(dbase[action.author_email].actions, action.id, 0);
        if (call[0]) {
          action.add_info.dup = Math.max(...call[3]) + 1;
        }
        dbase[req.body.prov_data.author_email].actions
.push(action);
        fs.writeFile(DB_PATH, JSON.stringify(dbase, null, 4), err => {
          if (err) {
            res.json("failed to create action");
          } else {
            pushToGithub().then(() => {
              res.json("action created successfully");
            });
          }
        });
      }
    });

  } else if (req.body.do == "update_name") {

    fs.readFile(DB_PATH, 'utf8', (error, data1) => {
      if (error) {
        res.json("failed to update name");
      } else {
        var dbase = JSON.parse(data1);
        dbase[req.body.u_email].name = req.body.new_name;
        fs.writeFile(DB_PATH, JSON.stringify(dbase, null, 4), err => {
          if (err) {
            res.json("failed to update name");
          } else {
            pushToGithub().then(() => {
              res.json("name updated successfully");
            });
          }
        });
      }
    });

  } else if (req.body.do == "like") {

    fs.readFile(DB_PATH, 'utf8', (error, data1) => {
      if (error) {
        res.json("failed to like");
      } else {
        var dbase = JSON.parse(data1);
        var call = lookup(dbase[req.body.prov_data[1]].actions, req.body.prov_data[2], req.body.prov_data[3]);
        if (call[0] && call[1] !== undefined) {
          var act_l =
    dbase[req.body.prov_data[1]].actions[call[4]].stats.likes;
          var act_d =
    dbase[req.body.prov_data[1]].actions[call[4]].stats.downvotes;
          if (act_d.includes(req.body.prov_data[0]) && !(act_l.includes(req.body.prov_data[0]))) {
            act_d.splice(act_d.indexOf(req.body.prov_data[0]), 1);
            act_l.push(req.body.prov_data[0]);
          } else if (act_l.includes(req.body.prov_data[0])) {
            act_l.splice(act_l.indexOf(req.body.prov_data[0]), 1);
          } else {
            act_l.push(req.body.prov_data[0]);
          }
          dbase[req.body.prov_data[1]].actions[call[4]].stats.likes = act_l;
          dbase[req.body.prov_data[1]].actions[call[4]].stats.downvotes = act_d;
          fs.writeFile(DB_PATH, JSON.stringify(dbase, null, 4), err => {
            if (err) {
              res.json("failed to like");
            } else {
              pushToGithub().then(() => {
                res.json(JSON.stringify([act_l, act_d]));
              });
            }
          });
        } else {
          res.json("failed to like");
        }
      }
    });

  } else if (req.body.do == "downvote") {

    fs.readFile(DB_PATH, 'utf8', (error, data1) => {
      if (error) {
        res.json("failed to downvote");
      } else {
        var dbase = JSON.parse(data1);
        var call = lookup(dbase[req.body.prov_data[1]].actions, req.body.prov_data[2], req.body.prov_data[3]);
        if (call[0] && call[1] !== undefined) {
          var act_l =
    dbase[req.body.prov_data[1]].actions[call[4]].stats.likes;
          var act_d =
    dbase[req.body.prov_data[1]].actions[call[4]].stats.downvotes;
          if (act_l.includes(req.body.prov_data[0]) && !(act_d.includes(req.body.prov_data[0]))) {
            act_l.splice(act_l.indexOf(req.body.prov_data[0]), 1);
            act_d.push(req.body.prov_data[0]);
          } else if (act_d.includes(req.body.prov_data[0])) {
            act_d.splice(act_d.indexOf(req.body.prov_data[0]), 1);
          } else {
            act_d.push(req.body.prov_data[0]);
          }
          dbase[req.body.prov_data[1]].actions[call[4]].stats.likes = act_l;
          dbase[req.body.prov_data[1]].actions[call[4]].stats.downvotes = act_d;
          fs.writeFile(DB_PATH, JSON.stringify(dbase, null, 4), err => {
            if (err) {
              res.json("failed to downvote");
            } else {
              pushToGithub().then(() => {
                res.json(JSON.stringify([act_l, act_d]));
              });
            }
          });
        } else {
          res.json("failed to downvote");
        }
      }
    });

  } else if (req.body.do == "fetch_data") {

    syncToGitHub().then(() => {
      fs.readFile(DB_PATH, 'utf8', (error, data1) => {
      if (error) {
        res.json("failed to fetch");
      } else {
        var fetched = [];
        var data = JSON.parse(data1);
        var keys = Object.keys(data);

        for (var m = 0; m < keys.length; m++) {
          for (var n = 0; n < data[keys[m]].actions.length; n++) {
            if (data[keys[m]].actions[n].action_hidden == false) {
              const currArt = structuredClone(data[keys[m]].actions[n]);
              currArt.author_name = data[keys[m]].name;
              currArt.role = data[keys[m]].role;
              fetched.push(currArt);
            }
          }
        }

        fetched.sort((a, b) => {
          let convertedDate = [];
          let dateParts = a.fullToday.split(' ');
          let date = dateParts[0].split('.');
          let time = dateParts[1].split(':');

          convertedDate.push(new Date(date[2], date[1] - 1, date[0], time[0], time[1], time[2]));

          dateParts = b.fullToday.split(' ');
          date = dateParts[0].split('.');
          time = dateParts[1].split(':');

          convertedDate.push(new Date(date[2], date[1] - 1, date[0], time[0], time[1], time[2]));

          return convertedDate[1] - convertedDate[0]
        });

        var perPage = 4;

        var pinned = fetched.filter((action) => action.pinned);
        var regular = fetched.filter((action) => !action.pinned);

        var ready_to_send = regular.slice( Number(0 + (perPage * (Number(req.body.prov_data) - 1))), Number(perPage + (perPage * (Number(req.body.prov_data) - 1))) );
        pinned.forEach((action) => { ready_to_send.push(action) });

        var sliceFurther = regular.slice( Number(perPage + (perPage * (Number(req.body.prov_data) - 1))) ).length > 0;
        ready_to_send = [sliceFurther, ready_to_send];

        console.log(ready_to_send);
        res.json(ready_to_send);

      }
      });
    });
  }
});




// no "app.listen(..)" because i'm hosting on Vercel and it requires this line
module.exports = app;



