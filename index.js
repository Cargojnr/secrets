import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcryptjs";
import session from 'express-session';
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";
// import WebSocket from "ws";

const app = express();
const port = 3000;
// const wss = new WebSocket.Server({port});
const saltRounds = 10;
env.config();

const db = new pg.Client({
    user: process.env.DB_USERNAME,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

db.connect();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true}));

app.use(
    session({
    secret: process.env.SESSION_SECRET, 
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24
    }
})
);

app.use(passport.initialize());
app.use(passport.session());


app.get("/", (req, res) => {
    res.render("home");
});
app.get("/login", (req, res) => {
    res.render("login");
});
app.get("/reset", (req, res) => {
    res.render("reset");
});
app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", async(req, res) => {
    console.log(req.user);
   if(req.isAuthenticated()) {
     try {
       const userSecret = await db.query("SELECT secrets.id,secret,user_id FROM secrets JOIN users ON users.id = user_id WHERE user_id = $1 ORDER BY secrets.id ASC", [
        req.user.id
       ])
       const secrets = userSecret.rows;

       const result = await db.query("SELECT secrets.id, username,user_id, secret FROM secrets JOIN users ON users.id = user_id ORDER BY secrets.id DESC ")
       const usersSecret = result.rows;
       console.log(usersSecret)

        if(secrets.length > 0) {
          res.render("secrets", {heading:"My Dark Secrets", pGrph: null, secret: secrets, secrets: usersSecret, userId: req.user.id, username: req.user.username})
         } else{
          res.render("secrets", {heading: "You have no secrets", pGrph: "Aren't you tired of keeping those secrets?. C'mon you can share them anonymously", secrets: usersSecret, userId: req.user.id, username: req.user.username})
        }
     } catch(error){
        console.log(error)
     }
   } else {
      res.redirect("login")
   }
});

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()) {
        console.log(req.user)
        res.render("submit", { submit: "Submit"})
    } else {
        res.redirect("login")
    }
});

app.get("/logout", (req, res) => {
    req.logout((err) => {
      if(err) console.log(err)
        res.redirect("login");
    })
})

app.get("/secret/:id", async (req, res) => {
    const requestedId = parseInt(req.params.id)
    if(req.isAuthenticated()) {
      try{
         const result = await db.query("SELECT secret, secrets.id, user_id FROM secrets JOIN users ON users.id = user_id WHERE secrets.id = $1 ORDER BY secrets.id DESC", [
            requestedId
         ])
         const data = result.rows[0];
         console.log(data);

         const commentResult =  await db.query("SELECT comment, comments.user_id, username,secret, comments.id FROM comments JOIN users ON users.id = comments.user_id JOIN secrets ON secrets.id = secret_id WHERE secrets.id = $1 ORDER BY comments.id DESC",[
            requestedId
           ])
          const commentData = commentResult.rows;
          console.log(commentData)

          if(commentData.length > 0) {
            res.render("secret", {secret: data, comments: commentData })
          }else {
            res.render("secret", {secret: data, noComment: "No comments yet."})
          }

      } catch(error) {
        console.log(error)
      }
    } else {
        res.render("login")
    }
});

app.get("/notifications", async (req, res) => {
    if(req.isAuthenticated()) {
        try {
            const result = await db.query("SELECT secrets.id, username ,user_id, secret FROM secrets JOIN users ON users.id = user_id ORDER BY secrets.id DESC ")
            const usersSecret = result.rows;
            console.log(usersSecret)

            const commentResult =  await db.query("SELECT comment, secrets.user_id, username,secret, comments.id FROM comments JOIN users ON users.id = comments.user_id JOIN secrets ON secrets.id = secret_id  ORDER BY comments.id DESC")
              const commentData = commentResult.rows;

              const secretResult = await db.query("SELECT secrets.id, username ,user_id, secret FROM secrets JOIN users ON users.id = user_id WHERE user_id != $1 ORDER BY secrets.id DESC LIMIT 5",[
                req.user.id
            ]);

           const commentsResult = await db.query("SELECT comments.user_id, secrets.id, comment, username, secret FROM comments JOIN users ON users.id = comments.user_id JOIN secrets ON secrets.id = secret_id WHERE secrets.user_id = $1  ORDER BY comments.id DESC LIMIT 5", [
            req.user.id
           ])
            
            const notifySecret = secretResult.rows
            const notifyComment = commentsResult.rows;

             if(notifySecret.length > 0 || notifyComment.length > 0) {
                
                    res.render("notifications", {heading: `New secrets from`, comments: notifyComment, secrets: notifySecret, userId: req.user.id, username: req.user.username})
                    console.log(notifySecret)
                     console.log(notifyComment)
              }else {
                res.render("notifications", {heading: null,comments: null, secrets: notifySecret, userId: req.user.id, username: req.user.username})
            }
        } catch(error) {
          console.log(error);
        }
    } else {
        res.redirect("login")
    }
})

// wss.on('connection', ws => {
//     ws.on('message', message => {
//         console.log('recieved', message);
//     });

//     ws.send(JSON.stringify({type: 'notification', message: 'You have a new notification'}));
// })

app.post("/search", async (req, res) => {
    const findAccount = req.body.findAccount
    if(findAccount !== "") {
        try {
            const result = await db.query ("SELECT * FROM users WHERE LOWER(email) = $1", [
                findAccount.toLowerCase()
            ]);
            const user = result.rows[0];
          res.render("reset", {foundUser: user})
        }catch(error){
            console.log(error);
        }
    } else {
        res.render("reset", {message: "Enter email linked to account"})
    }
})

app.post("/reset", async(req, res) => {
  const newPassword = req.body.newPassword
  const confirmPassword = req.body.confirmPassword
  const foundUserId = req.body.id

  try {
    if(newPassword !== "" && confirmPassword !== "") {
        if(newPassword === confirmPassword) {
            bcrypt.hash(newPassword, saltRounds, async (err, hash) => {
                if(err) {
                    console.log("Error hashing passwords:", err)
                } else {
                    const result = await db.query("UPDATE users SET password = $1 WHERE id = $2 RETURNING *", [
                        hash, foundUserId
                    ]);
                    const user = result.rows[0];
                    console.log(result);
                   req.login(user, (err) => {
                    console.log(err);
                    res.redirect("secrets");
                   })
                }
            });
        } else {
          res.render
        }
    } else {
       
    }
  } catch(error) {
    console.log(error)
  }
})

app.post("/share", async (req, res) => {
    const secret = req.body.secret;
    console.log(req.id);
        try{
            await db.query("INSERT INTO secrets(secret, user_id) VALUES($1, $2)", [
               secret, req.user.id
            ]);
            res.redirect("secrets");
           }catch(error){
               console.log(error)
           } 
});


app.post("/edit", async (req, res) => {
    const secretId = req.body.id;
    if(req.isAuthenticated()) {
        try{
            const result = await db.query("SELECT secrets.id, secret FROM secrets JOIN users ON users.id = user_id WHERE secrets.id = $1", [
              secretId
            ]);

            const data = result.rows[0];
            res.render("submit", {submit: "Update", secret: data})
        } catch(error) {
         console.log(error);
        }
      
    } else {
        res.redirect("login")
    }
});

app.post("/update", async (req, res) => {
    const id = req.body.id;
    const updatedSecret = req.body.secret
    if(req.isAuthenticated()) {
        try{
         const result = await db.query("UPDATE secrets SET secret = $1 WHERE id = $2 RETURNING *", [
           updatedSecret,id
         ]);
         const data = result.rows[0]
         console.log(data);
         res.redirect("secrets")
        } catch(error) {
            console.log(error);
        }
    } else {
        res.redirect("login")
    }
})

app.post("/delete", async (req, res) => {
   if(req.isAuthenticated()) {
    const id = req.body.id
     try {
       await db.query("DELETE FROM comments WHERE secret_id= $1", [
         id
       ])

       await db.query("DELETE FROM secrets WHERE id= $1", [
         id
       ])

       res.redirect("secrets");
     } catch(error){
        console.log(error)
     }
   } else {
    res.redirect("login")
   }
});

app.post("/comment", async (req, res) => {
    const secretId = req.body.id;
    const comment = req.body.comment;
    if(!comment) {
        return res.status(400).json({ success: false, error: 'Comment cannot be empty' });
    } 
    try {
         await db.query("INSERT INTO comments(comment, secret_id, user_id) VALUES($1, $2, $3)", [
         comment, secretId, req.user.id
       ])
 
       const result =  await db.query("SELECT comment, username,secret, secrets.id, secrets.user_id FROM comments JOIN users ON users.id = comments.user_id JOIN secrets ON secrets.id = secret_id WHERE secrets.id = $1 ORDER BY comments.id DESC LIMIT 1", [
         secretId
       ])
       const newComment  = result.rows[0];
      console.log(newComment);
       res
    //    .json({success: true, comment: newComment.comment, username: newComment.username})
    .status(200)
    .redirect(`secret/${secretId}` )
     } catch(error) {
         console.log(error)
         res.json({success:false, error: 'Failed to add comment'});
     }
})


app.post("/register", async (req, res) => {
    const username = req.body.username
    const email = req.body.email
    const password = req.body.password
    try {
        const checkResult = await db.query("SELECT * FROM users WHERE username = $1", [
            username
        ]);

        if(checkResult.rows.length > 0) {
            res.render("register", {message: `Username ${username} already exists. Try logging in.`})
        } else {
            //Password hashing
            bcrypt.hash(password, saltRounds, async (err, hash) => {
                if(err) {
                    console.log("Error hashing passwords:", err)
                } else {
                    const result = await db.query("INSERT INTO users(username, email, password) VALUES($1, $2, $3) RETURNING *", [
                        username, email, hash
                    ]);
                    const user = result.rows[0];
                    console.log(result);
                   req.login(user, (err) => {
                    console.log(err);
                    res.redirect("/secrets");
                   })
                }
            })
        }
    } catch(error) {
        console.log(error);
    }
    
});

app.post("/login", passport.authenticate("local", 
    {
    successRedirect: "/secrets",
    failureRedirect: "/login",
}
));

passport.use(new Strategy(async function verify(username, password, cb){
    console.log(username)
    try {
        const result = await db.query ("SELECT * FROM users WHERE LOWER(username || ' ' || email) LIKE '%' || $1 || '%'", [
            username
        ]);
        if(result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashedpassword = user.password;
            bcrypt.compare(password, storedHashedpassword, (err, result) => {
                if(err) {
                    return cb(err);
                } else {
                    if(result){
                        return cb(null, user);
                    } else {
                        return cb(null, false);
                        // res.render("login", {message: `Incorrect password`});
                    }
                    console.log(result)
                }
            });
        } else {
            return cb("User not found")
            // res.render("login", {message: `User not found.`});
        }
    
        } catch(error){
          return cb(error);
        }
    
}));

passport.serializeUser((user, cb)  => {
    cb(null, user);
});

passport.deserializeUser((user, cb)  => {
    cb(null, user);
});

app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});