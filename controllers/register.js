const handleRegister = (req, res, db, bcrypt) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json('incorrect form submission');
  }
  const hash = bcrypt.hashSync(password);
    db.transaction(trx => {
      trx('login').insert({
        hash: hash,
        email: email
      })
      // .into('login') /* This what Andrei had but I changed it */
      .returning('email')
      .then(loginEmail => {
        return trx('users')
        .insert({
          email: loginEmail[0],
          name: name,
          joined: new Date()
        })
        .returning('*')
        .then(user => {
          res.json(user[0]);
        })
      })
      .then(trx.commit)
      .catch(trx.rollback)
    })
    .catch(err => res.status(400).json('unable to register'))
}

module.exports = {
  handleRegister: handleRegister
};


