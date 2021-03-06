'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const helper = require('./../helper');

module.exports = knex => {
  // const getCurrentUser = req => {
  //   let currentId = req.session.user_id;
  //   knex('users')
  //     .select('id', 'username')
  //     .where('id', currentId)
  //     .then(user => {
  //       req.user = user;
  //       next();
  //     });
  // };

  // -------- ALL GET ROUTES ----------

  // @route   GET api/users
  // @desc    check for currentUser else redirect to login
  // @access  Public
  //router.use(getCurrentUser);

  // router.get('/', (req, res) => {
  //   // req.userPromise.then(user => {
  //   //   console.log('CurrentUser :', user);
  //   // });
  //   // const { id, username } = req.user;
  //   // console.log(getCurrentUser());
  //   // console.log('currentUser :', id, username);
  //   //const user_id = req.session.user_id;
  //   //const currentUser = getCurrentUser();
  //   //console.log('From users/:', user_id);
  //   if (user_id) {
  //     knex
  //       .select()
  //       .from('users')
  //       .where('id', user_id)
  //       .returning(['id', 'username'])
  //       .then(user => {
  //         // console.log('Inside user:', user[0]);
  //         res.redirect(`/api/users/${user[0].id}`);
  //         // .render('login')
  //       });
  //   } else {
  //     req.session = null;
  //     res.redirect(`/api/users/login`);
  //   }
  // });

  // @route   GET api/users/register
  // @desc    renders register page
  // @access  Public

  router.get('/register', (req, res) => {
    res.render('register');
  });

  // @route   GET api/users/login
  // @desc    renders login page
  // @access  Public

  router.get('/login', (req, res) => {
    res.status(200).render('login');
  });

  router.get('/:id', (req, res) => {
    let allResources = {};
    let user_id = req.session.user_id;
    console.log('CURRENT USER ALEX :', user_id);
    knex('resourses')
      .select('*')
      .join('user_resourses', 'resourses.id', 'user_resourses.resourse_id')
      //.join('users', 'user_resourses.user_id', 'users.id')
      .where('user_resourses.user_id', user_id)
      .then(resources => {
        console.log('user resourses:', resources);
        resources.map(resource => {
          allResources[resource.id] = {
            user_id,
            ...resource,
            totalLikes: 0,
            countRatings: 0,
            totalRating: 0,
            avgRating: function() {
              return this.totalRating / this.countRatings;
            },
            comments: []
          };
        });
      })
      .then(() => {
        knex('resourses')
          .select()
          .join('user_likes', 'user_likes.resourse_id', 'resourses.id')
          .where('user_likes.user_id', user_id)
          .then(likedResourses => {
            console.log('liked resourses:', likedResourses);
            likedResourses.map(resource => {
              delete allResources[resource.id];
              allResources[resource.id] = {
                user_id,
                ...resource,
                totalLikes: 0,
                countRatings: 0,
                totalRating: 0,
                avgRating: function() {
                  return this.totalRating / this.countRatings;
                },
                comments: []
              };
            });
          });
      })
      .then(() => {
        console.log('All resourses', allResources);
        return knex('user_comments')
          .select(
            'user_comments.id',
            'users.username',
            'user_comments.text',
            'user_comments.updated_at',
            'user_comments.resourse_id'
          )
          .innerJoin('users', 'users.id', 'user_comments.user_id');
      })
      .then(comments => {
        comments.map(comment => {
          if (allResources[comment.resourse_id]) {
            comment.updated_at = helper.postTime(comment);
            allResources[comment.resourse_id].comments.push(comment);
          }
        });
      })
      .then(() => {
        return knex('user_likes').select('*');
      })
      .then(allLikes => {
        allLikes.map(like => {
          if (allResources[like.resourse_id]) {
            allResources[like.resourse_id].totalLikes++;
          }
        });
      })
      .then(() => {
        return knex('user_resourse_rating').select('*');
      })
      .then(allRatings => {
        allRatings.map(rating => {
          if (allResources[rating.resourse_id]) {
            allResources[rating.resourse_id].countRatings += 1;
            allResources[rating.resourse_id].totalRating += rating.rating;
            delete allResources[rating.resourse_id].password;
          }
        });
      })
      .then(() => {
        console.log(allResources);
        return knex('users')
          .select('username')
          .where('id', user_id);
      })
      .then(user => {
        console.log('Inside knex:', user[0].username);
        let templateVars = {
          currentUser: user[0].username,
          user_id,
          allResources
        };
        console.log('TEMPLATE VARS:', templateVars);
        res.status(200).render('myresourses', templateVars);
      })
      .catch(err => {
        console.error(err.message);
        res.status(500).send('Mesaage : 500 : Internal server error');
      });
  });

  // @route GET  api/users/:id/profile
  // @desc  get logged in users profile
  // @access  Private

  router.get('/:id/profile', (req, res) => {
    const { id } = req.params;
    //console.log(req.session.user_id);
    const user_id = req.session.user_id;
    if (id == req.session.user_id) {
      knex
        .select('*')
        .from('profiles')
        .where('user_id', id)
        .then(profile => {
          console.log(profile);
          if (profile[0]) {
            res.render('userpage', {
              user_id: profile[0].user_id,
              currentUser: profile[0].name,
              ...profile[0]
            });
          } else {
            res.status(404).send('404 : NO PROFILE FOUND');
          }
        })
        .catch(err => {
          //console.log(err);
          // res.status(404).send('Mesaage : 404 :No resourses found');
          res.status(404).redirect(`/api/users/${id}/profile`);
        });
    } else {
      res.status(401).redirect(`/api/users/${id}`);
    }
  });

  // @route GET  api/users/:id/profile
  // @desc  get logged in users profile
  // @access  Private

  router.get('/:id/profile/new', (req, res) => {
    const { id } = req.params;
    //console.log(req.session.user_id);
    const user_id = req.session.user_id;
    if (id == req.session.user_id) {
      // let teplateVars = { user_id, currentUser };
      knex('users')
        .returning()
        .select()
        .where('id', user_id)
        .then(result => {
          console.log('current user:', result);

          res.status(200).render('newProfile', {
            user_id: result[0].id,
            password: result[0].id,
            currentUser: result[0].username
          });
        });

      //res.status(200).render('userpage',{userName:});
      // knex
      //   .select('*')
      //   .from('profiles')
      //   .where('user_id', id)
      //   .then(profile => {
      //     console.log(profile);
      //     if (profile[0]) {
      //       res.render('userpage', {
      //         user_id: profile[0].user_id,
      //         currentUser: profile[0].name,
      //         ...profile[0]
      //       });
      //     } else {
      //       res.status(404).send('404 : NO PROFILE FOUND');
      //     }
      // }
      // .catch(err => {
      //   //console.log(err);
      //   // res.status(404).send('Mesaage : 404 :No resourses found');
      //   res.status(404).redirect(`/api/users/${id}/profile`);
      // });
    } else {
      res.status(401).redirect(`/api/users/${id}`);
    }
  });

  // @route   GET api/users/:id/rate
  // @desc    gets all rated by  current user
  // @access  Private
  router.get('/:id/rate', (req, res) => {
    const { id } = req.params;
    //console.log('GET /:id:', id);
    knex
      .select('*')
      .from('resourses')
      .join(
        'user_resourse_rating',
        'resourses.id',
        'user_resourse_rating.resourse_id'
      )
      //.join('users', 'users.id', 'user_resourse_rating.user_id')
      .where('user_resourse_rating.user_id', id)
      //.join('resourses', 'user_resourses.resourse_id', 'resourses.id')
      .then(resourses => {
        res.status(200).send(resourses);
      })
      .catch(err => {
        console.log(err);
        res.status(404).send('Mesaage : 404 :No resourses found');
      });
  });

  // @route   GET api/users/:id/like
  // @desc    gets current user
  // @access  Private
  router.get('/:id/like', (req, res) => {
    const { id } = req.params;
    console.log('GET /:id:', id);
    knex
      .select('*')
      .from('resourses')
      .join('user_likes', 'resourses.id', 'user_likes.resourse_id')
      //.join('users', 'users.id', 'user_likes.user_id')
      .where('user_likes.user_id', id)
      //.join('resourses', 'user_resourses.resourse_id', 'resourses.id')
      .then(resourses => {
        res.status(200).send(resourses);
      })
      .catch(err => {
        console.log(err);
        res.status(404).send('Mesaage : 404 :No resourses found');
      });
  });
  // @route   GET api/users/:id/comment
  // @desc    gets current users commented resourses
  // @access  Private
  router.get('/:id/comment', (req, res) => {
    const { id } = req.params;
    console.log('GET /:id', id);
    knex
      .select('*')
      .from('resourses')
      .innerJoin('user_comments', 'resourses.id', 'user_comments.resourse_id')
      //.innerJoin('users', 'users.id', 'user_comments.user_id')
      .where('user_comments.user_id', id)
      //.join('resourses', 'user_resourses.resourse_id', 'resourses.id')
      .then(resourses => {
        res.status(200).send(resourses);
      })
      .catch(err => {
        console.log(err);
        res.status(404).send('Mesaage : 404 :No resourses found');
      });
  });

  // ============= POST REQUESTS ==================== //

  // @route   POST api/users/login
  // @desc    renders login page
  // @access  Public

  router.post('/login', (req, res) => {
    const { username, password } = req.body;
    console.log('POST /login : req.body', req.body);

    knex
      .select()
      .from('users')
      .where({
        username: username
      })
      //.returning(['id', 'username'])
      .then(user => {
        console.log('POST /login:', user[0]);
        const isRightPassword = bcrypt.compareSync(password, user[0].password);
        if (isRightPassword) {
          console.log('POST /login: inside bcrypt', user[0]);

          req.session.user_id = user[0].id;
          console.log('From login:', user.username);
          res.status(200).redirect(`/api/users/${user[0].id}`);
        } else {
          res.status(403).send('Mesaage: 403: Invalid username or password');
        }
      })
      .catch(err => {
        console.log('ERROR IS', err);
        res.status(403).send('Mesaage: 403: Invalid username or password');
      });
  });

  // @route   POST api/users/logout
  // @desc    logsout user and redirects to home page
  // @access  Public
  router.post('/logout', (req, res) => {
    req.session = null;
    res.status(200).redirect('/');
  });

  // @route   POST api/users/register
  // @desc  registers new users
  // @access  Public
  router.post('/register', (req, res) => {
    const { username, password } = req.body;
    knex('users')
      //.returning('username')
      .select('username')
      .where('username', username)
      .then(result => {
        console.log('user exists', result);
        if (result.length) {
          throw error('username not available');
        }
      })
      .then(() => {
        const hashedPassword = bcrypt.hashSync(password, 10);
        return knex('users')
          .returning(['id', 'username'])
          .insert({
            username,
            password: hashedPassword
          });
      })
      .then(user => {
        console.log('sEtting cookie in register:', user[0].id);
        req.session.user_id = user[0].id;
        knex('profiles')
          .insert({
            user_id: user[0].id,
            name: username,
            email: '',
            location: '',
            interest1: '',
            interest2: '',
            interest3: ''
          })
          .then(() => {
            res.status(201).redirect(`/api/users/${user[0].id}`);
          });
      })
      .catch(err => {
        console.error('FROM catch:', err.message);
        res.status(400).send('Message: 400: Bad request: username or password');
      });
  });

  // @route   POST api/users/:id/resourse
  // @desc post a new resourse
  // @access  Private
  router.post('/:id/resourse', (req, res) => {
    const { id } = req.params;
    const { url, title, description, intrest_id } = req.body;
    let newResourse;
    return knex
      .transaction(function(t) {
        return knex('resourses')
          .transacting(t)
          .insert({
            url,
            title,
            description,
            intrest_id
          })
          .returning('*')
          .then(function(response) {
            console.log('RESPONSE:', response);
            newResourse = response[0];
            return knex('user_resourses')
              .transacting(t)
              .insert({
                user_id: id,
                resourse_id: response[0].id
              });
          })
          .then(t.commit)
          .catch(t.rollback);
      })
      .then(function(resp) {
        console.log('Transaction complete.');
        res.status(201).redirect(`/api/users/${id}`);
      })
      .catch(function(err) {
        console.error(err);
//        res.status(400).send('Message : 400 : Bad request');
          res.status(400).redirect('/api/users/${id}');
      });
  });

  // @route   POST  api/users/:id/profile
  // @desc  update logged in users profile
  // @access  Private
  router.post('/:id/profile', (req, res) => {
    const { id } = req.params;
    console.log(req.session);
    console.log(req.body, req.session.user_id);
    knex('profiles')
      .update({
        ...req.body,
        user_id: id
      })
      .where('user_id', id)
      .then(profile => {
        console.log('added Profile :', profile);
        res.status(201).redirect(`/api/users/${id}`);
      })
      .catch(err => {
        console.log(err);
        res.status(400).send('Status : 400 : Bad request');
      });
  });

  // @route   POST api/users/:user_id/resourses/:resourse_id/like
  // @desc  logged in user addes a like to a resourse
  // @access  Private
  router.post('/:user_id/resourses/:resourse_id/like', (req, res) => {
    const { user_id, resourse_id } = req.params;
    console.log('req.params:', req.params);
    knex('user_likes')
      .select()
      .where({
        user_id: user_id,
        resourse_id: resourse_id
      })
      .then(result => {
        console.log(result);
      });
    knex('user_likes')
      .insert({
        user_id: user_id,
        resourse_id: resourse_id
      })
      .then(result => {
        console.log('result :', result);
        //        res.status(201).send(`Like added to resource ${resourse_id}`);
        res.status(201).redirect(`/`);
      })
      .catch(err => {
        console.log(err);
        //        res.status(400).send('Status : 400 : Bad request');
        res.status(400).redirect(`/`);
      });
  });

  // @route   POST api/users/:user_id/resourses/:resourse_id/comment
  // @desc  logged in user addes a comment to a resourse
  // @access  Private
  router.post('/:user_id/resourses/:resourse_id/comment', (req, res) => {
    const { user_id, resourse_id } = req.params;
    const { text } = req.body;
    console.log('req.params:', req.params);
    knex('user_comments')
      .insert({
        text: text,
        user_id: user_id,
        resourse_id: resourse_id
      })
      .then(result => {
        console.log('result :', result);
        res.redirect("/");
      })
      .catch(err => {
        console.log(err);
        res.status(400).send('Status : 400 : Bad request');
      });
  });

  // @route   POST api/users/:user_id/resourses/:resourse_id/rate
  // @desc  logged in user addes a rate to a resourse
  // @access  Private
  router.post('/:user_id/resourses/:resourse_id/rate', (req, res) => {
    const { user_id, resourse_id } = req.params;
    let userRating = req.body.rating;
    let rating = +userRating;
    console.log('rating', rating);
    //const { rating } = req.body;
    console.log('req.params:', req.params);
    console.log('req.body:', req.body);
    // console.log('rating', rating);
    knex('user_resourse_rating')
      .insert({
        rating: rating,
        user_id: user_id,
        resourse_id: resourse_id
      })
      .then(result => {
        console.log('result :', result);
        //        res.status(201).send(`Rating added to resourse ${resourse_id}`);
        res.status(201).redirect(`/`);
      })
      .catch(err => {
        console.log(err);
        //        res.status(400).send('Status : 400 : Bad request');
        res.status(400).redirect(`/`);
      });
  });

  // ============= PUT REQUESTS ==================== //

  // @route   PUT  api/users/:id/profile
  // @desc  update logged in users profile
  // @access  Private
  router.put('/:id/profile', (req, res) => {
    const { id } = req.params;
    console.log(req.session);
    console.log(req.session.user_id);
    //console.log('req.params:', req.params);
    //if (id == req.session.user_id) {
    knex('profiles')
      .update({
        ...req.body,
        user_id: id
      })
      .where('user_id', id)
      .then(profile => {
        console.log('added Profile :', profile);
        res.status(201).send(`/api/users/${id}/profile`);
      })
      .catch(err => {
        console.log(err);
        res.status(400).send('Status : 400 : Bad request');
      });
    //} else {
    // res.status(401).send('Status : 400 : Unauthorized');
    //}
  });

  // @route   PUT  api/users/:id/resourse
  // @desc  update logged in users profile
  // @access  Private
  router.put('/:user_id/resourses/:resourse_id', (req, res) => {
    const { user_id, resourse_id } = req.params;
    console.log('from PUT resourse:', req.session);
    console.log('from PUT resourse:', req.session.user_id);
    console.log('from PUT resourse:', req.body);
    //console.log('req.params:', req.params);
    //if (id == req.session.user_id) {
    knex('resourses')
      .update(req.body)
      .where('id', resourse_id)
      .then(resourse => {
        console.log('Updated resourse :', resourse);
        //res.status(201).send(`/api/users/${id}/profile`);
      })
      .catch(err => {
        console.log(err);
        res.status(400).send('Status : 400 : Bad request');
      });
    //} else {
    // res.status(401).send('Status : 400 : Unauthorized');
    //}
  });

  // @route   PUT  api/users/:id/resourses
  // @desc  update logged in users profile
  // @access  Private
  router.put(
    '/:user_id/resourses/:resourse_id/comment/:comment_id',
    (req, res) => {
      const { user_id, resourse_id, comment_id } = req.params;
      console.log('from PUT comments:', req.session);
      console.log('from PUT comments:', req.session.user_id);
      console.log('from PUT comments:', req.body);
      //console.log('req.params:', req.params);
      //if (id == req.session.user_id) {
      knex('user_comments')
        .update(req.body)
        .where({
          id: comment_id,
          user_id: user_id,
          resourse_id: resourse_id
        })
        .then(resourse => {
          console.log('Updated resourse :', resourse);
          //res.status(201).send(`/api/users/${id}/profile`);
        })
        .catch(err => {
          console.log(err);
          res.status(400).send('Status : 400 : Bad request');
        });
      //} else {
      // res.status(401).send('Status : 400 : Unauthorized');
      //}
    }
  );

  // @route   PUT  api/users/:user_id/resourses/:resourses_id/rate
  // @desc  update rating for a resourse by a logged in  users
  // @access  Private
  router.put('/:user_id/resourses/:resourse_id/rate', (req, res) => {
    const { user_id, resourse_id } = req.params;
    console.log('from PUT comments:', req.session);
    console.log('from PUT comments:', req.session.user_id);
    console.log('from PUT comments:', req.body);
    //console.log('req.params:', req.params);
    //if (id == req.session.user_id) {
    knex('user_resourse_rating')
      .update(req.body)
      .where({
        user_id: user_id,
        resourse_id: resourse_id
      })
      .then(resourse => {
        console.log('Updated resourse :', resourse);
        //res.status(201).send(`/api/users/${id}/profile`);
      })
      .catch(err => {
        console.log(err);
        res.status(400).send('Status : 400 : Bad request');
      });
    //} else {
    // res.status(401).send('Status : 400 : Unauthorized');
    //}
  });

  // ============= DELETE REQUESTS ==================== //

  // @route DELETE  api/users/:user_id/resourses/:resourses_id
  // @desc delete a resourse
  // @access  Private
  router.delete('/:user_id/resourses/:resourse_id', (req, res) => {
    const { user_id, resourse_id } = req.params;
    console.log('from PUT comments:', req.session);
    console.log('from PUT comments:', req.session.user_id);
    //console.log('from PUT comments:', req.params);
    console.log('req.params:', req.params);
    //if (id == req.session.user_id) {
    let deletedResourse;
    return knex
      .transaction(function(t) {
        return knex('user_resourses')
          .transacting(t)
          .where({
            user_id: user_id,
            resourse_id: resourse_id
          })
          .delete()
          .returning('*')
          .then(function(response) {
            console.log('RESPONSE:', response);
            return knex('resourses')
              .transacting(t)
              .where({
                id: resourse_id
              })
              .delete()
              .returning('*');
          })
          .then(response => {
            deletedResourse = response[0];
            t.commit;
          })
          .catch(err => (console.log('err', err), t.rollback));
      })
      .then(function(resp) {
        console.log('Transaction complete.');
        res.status(200).send(deletedResourse);
      })
      .catch(function(err) {
        console.error(err);
        res.status(400).send('Message : 400 : Bad request');
      });
  });

  return router;
};
