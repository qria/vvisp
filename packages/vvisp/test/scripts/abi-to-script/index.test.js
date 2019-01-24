const chai = require('chai');
const assert = chai.assert;
chai.use(require('chai-as-promised')).should();
require('dotenv').config();

const path = require('path');
const fs = require('fs-extra');
const abiToScript = require('../../../scripts/abi-to-script');

const {
  compileAndDeploy,
  forIn,
  getWeb3,
  getPrivateKey,
  privateKeyToAddress
} = require('@haechi-labs/vvisp-utils');
const web3 = getWeb3();

const CONTRACT1 = 'Attachment';
const CONTRACT2 = 'Token_V0';
const CONTRACT_PATH1 = path.join(`./contracts/test/${CONTRACT1}.sol`);
const CONTRACT_PATH2 = path.join(`./contracts/test/${CONTRACT2}.sol`);
const FILES = [CONTRACT_PATH1, CONTRACT_PATH2];
const ROOT = path.join('./contractApis');

const PRIV_KEY = getPrivateKey(process.env.MNEMONIC);
const SENDER = privateKeyToAddress(PRIV_KEY);

describe('# abi-to-script process test', function() {
  this.timeout(50000);
  before(function() {
    fs.removeSync(ROOT);
  });
  after(function() {
    fs.removeSync(ROOT);
  });
  describe('# back version', function() {
    describe('# process test', function() {
      before(function() {
        this.files = FILES;
        this.root = path.join(ROOT, 'back');
        this.abi = path.join(this.root, 'abi');
        this.js = path.join(this.root, 'js');
      });
      it('should be fulfilled', async function() {
        await abiToScript(this.files, { silent: true }).should.be.fulfilled;
      });
      it('should make all directories', function() {
        fs.lstatSync(ROOT)
          .isDirectory()
          .should.be.equal(true);
        fs.lstatSync(this.root)
          .isDirectory()
          .should.be.equal(true);
        fs.lstatSync(this.abi)
          .isDirectory()
          .should.be.equal(true);
        fs.lstatSync(this.js)
          .isDirectory()
          .should.be.equal(true);
      });
      it('should make index files', function() {
        fs.lstatSync(path.join(this.root, 'index.js'))
          .isFile()
          .should.be.equal(true);
      });
      it('should make all abi files', function() {
        const files = fs.readdirSync(this.abi);
        files.length.should.be.equal(this.files.length);
        for (let i = 0; i < files.length; i++) {
          path.parse(files[i]).ext.should.be.equal('.json');
        }
      });
      it('should make all js files', function() {
        const files = fs.readdirSync(this.js);
        files.length.should.be.equal(this.files.length);
        for (let i = 0; i < files.length; i++) {
          path.parse(files[i]).ext.should.be.equal('.js');
        }
      });
    });
    describe('# output test', function() {
      before(async function() {
        this.apis = require('../../../contractApis/back');
        const txCount = await web3.eth.getTransactionCount(SENDER);
        this.receipt1 = await compileAndDeploy(CONTRACT_PATH1, PRIV_KEY, [], {
          silent: true,
          txCount: txCount
        });
        this.receipt2 = await compileAndDeploy(CONTRACT_PATH2, PRIV_KEY, [], {
          silent: true,
          txCount: txCount + 1
        });
      });
      it('should have two constructor functions', function() {
        forIn(this.apis, Contract => {
          Contract.should.be.a('function');
        });
      });
      it('should make api instances', function() {
        this.attachment = new this.apis[CONTRACT1](
          this.receipt1.contractAddress
        );
        this.token = new this.apis[CONTRACT2](this.receipt2.contractAddress);
        this.attachment
          .getAddress()
          .should.equal(this.receipt1.contractAddress);
        this.token.getAddress().should.equal(this.receipt2.contractAddress);
      });
      it('should change address', function() {
        const tmpAddress = '0x88C22c3Fe7A049e42cF4f3a5507e6820F0EceE61';
        const address1 = this.attachment.getAddress();
        const address2 = this.token.getAddress();
        this.attachment.at(tmpAddress);
        this.token.at(tmpAddress);
        this.attachment.getAddress().should.equal(tmpAddress);
        this.token.getAddress().should.equal(tmpAddress);
        this.attachment.at(address1);
        this.token.at(address2);
      });
      it('should call function', async function() {
        const txCount = await web3.eth.getTransactionCount(SENDER);
        await this.attachment.methods.initialize(SENDER).should.be.fulfilled;
        await this.token.methods.initialize(SENDER, { txCount: txCount + 1 })
          .should.be.fulfilled;
      });
      it('should get owner', async function() {
        (await this.attachment.methods.owner()).should.equal(SENDER);
        (await this.token.methods.owner()).should.equal(SENDER);
      });
    });
  });
  describe('# front version', function() {
    describe('# process test', function() {
      before(function() {
        this.files = FILES;
        this.name = 'vvisp';
        this.root = path.join(ROOT, 'front');
        this.abi = path.join(this.root, 'abi');
        this.js = path.join(this.root, 'js');
      });
      it('should be fulfilled', async function() {
        await abiToScript(this.files, { silent: true, front: this.name }).should
          .be.fulfilled;
      });
      it('should make all directories', function() {
        fs.lstatSync(ROOT)
          .isDirectory()
          .should.be.equal(true);
        fs.lstatSync(this.root)
          .isDirectory()
          .should.be.equal(true);
        fs.lstatSync(this.abi)
          .isDirectory()
          .should.be.equal(true);
        fs.lstatSync(this.js)
          .isDirectory()
          .should.be.equal(true);
      });
      it('should make all abi files', function() {
        const files = fs.readdirSync(this.abi);
        files.length.should.be.equal(this.files.length);
        for (let i = 0; i < files.length; i++) {
          path.parse(files[i]).ext.should.be.equal('.json');
        }
      });
      it('should make all js files', function() {
        const files = fs.readdirSync(this.js);
        files.length.should.be.equal(this.files.length + 1); // with index file
        let hasIndex = false;
        for (let i = 0; i < files.length; i++) {
          const parses = path.parse(files[i]);
          parses.ext.should.be.equal('.js');
          if (parses.name === this.name) {
            hasIndex = true;
          }
        }
        hasIndex.should.be.equal(true);
      });
      it('should make rollup files', function() {
        fs.lstatSync(path.join(this.root, 'vvisp.js'))
          .isFile()
          .should.be.equal(true);
        fs.lstatSync(path.join(this.root, 'vvisp.es.js'))
          .isFile()
          .should.be.equal(true);
      });
    });
  });
});
