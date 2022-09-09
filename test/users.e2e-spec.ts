import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource, DataSourceOptions, Repository } from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Verification } from 'src/users/entities/verification.entity';

jest.setTimeout(40000);

jest.mock('got', () => ({
  post: jest.fn(),
}));

const GRAPHQL_ENDPOINT = '/graphql';
const testUser = {
  email: 'tkxksdl2@gmail.com',
  password: '1234',
};

describe('UserModule (e2e)', () => {
  let app: INestApplication;
  let usersRepository: Repository<User>;
  let verificationRepository: Repository<Verification>;
  let jwtToken: string;

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT);
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({ query });

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    verificationRepository = module.get<Repository<Verification>>(
      getRepositoryToken(Verification),
    );
    await app.init();
  });

  afterAll(async () => {
    const options: DataSourceOptions = {
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    };
    const dataSource = new DataSource(options);
    const connection = await dataSource.initialize();
    await connection.dropDatabase();
    await connection.destroy();
    await app.close();
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve({});
      }, 20000);
    });
  });

  describe('createAccount', () => {
    const createAccountQuery = `
    mutation {
      createAccount(input:{
        email:"${testUser.email}"
        password:"${testUser.password}"
        role:Owner
      }) {
        ok
        error
      }
    }
    `;

    it('should create account', () => {
      return publicTest(createAccountQuery)
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.createAccount;
          expect(ok).toBe(true);
          expect(error).toBe(null);
        });
    });

    it('should fail if account already exists', () => {
      return publicTest(createAccountQuery)
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.createAccount;
          expect(ok).toBe(false);
          expect(error).toBe('User with input email already exists.');
        });
    });
  });

  describe('login', () => {
    it('should login with correct credentials', () => {
      return publicTest(`
          mutation{
            login(input:{
              email: "${testUser.email}"
              password: "${testUser.password}"
            }){
              ok
              token
              error
            }
          }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBeTruthy();
          expect(login.error).toBeNull();
          expect(login.token).toEqual(expect.any(String));
          jwtToken = login.token;
        });
    });

    it('should not be able to login with wrong credentials', () => {
      return publicTest(`
          mutation{
            login(input:{
              email: "${testUser.email}"
              password: "WRONG_PASSWORD"
            }){
              ok
              token
              error
            }
          }
      `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res;
          expect(login.ok).toBeFalsy();
          expect(login.error).toEqual(expect.any(String));
          expect(login.token).toBeNull();
        });
    });
  });

  describe('userProfile', () => {
    let userId: number;
    beforeAll(async () => {
      const [user] = await usersRepository.find();
      userId = user.id;
    });
    it('should see a userProfile', () => {
      return privateTest(`{
        userProfile(userId:${userId}){
          ok
          error
          user {
            id
          }
        }
      }`)
        .expect(200)
        .expect((res) => {
          const {
            ok,
            error,
            user: { id },
          } = res.body.data.userProfile;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
          expect(id).toBe(userId);
        });
    });

    it('should not find profile', () => {
      return privateTest(`{
          userProfile(userId:13213){
            ok
            error
            user {
              id
            }
          }
        }
        `)
        .expect(200)
        .expect((res) => {
          const { ok, error, user } = res.body.data.userProfile;
          expect(ok).toBeFalsy();
          expect(error).toBe('User not Found');
          expect(user).toBeNull();
        });
    });
  });

  describe('me', () => {
    it('should find my profile', () => {
      return privateTest(`{
          me{
            email
          }
        }`)
        .expect(200)
        .expect((res) => {
          const { email } = res.body.data.me;
          expect(email).toBe(testUser.email);
        });
    });

    it('should not allow logged out user', () => {
      return publicTest(`{
          me{
            email
          }
        }`)
        .expect(200)
        .expect((res) => {
          const { errors } = res.body;
          const [{ message }] = errors;
          expect(message).toBe('Forbidden resource');
        });
    });
  });

  describe('editProfile', () => {
    const NEW_EMAIL = 'updated@mail.com';
    it('should change email', () => {
      return privateTest(`mutation {
        editProfile(input:{
          email: "${NEW_EMAIL}"
        }){
          ok
          error
        }
        }`)
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.editProfile;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
        })
        .then(() => {
          privateTest(`{
              me{
                email
              }
            }`)
            .expect(200)
            .expect((res) => {
              const { email } = res.body.data.me;
              expect(email).toEqual(NEW_EMAIL);
            });
        });
    });

    it('should fail if email already exist', () => {
      return privateTest(`mutation {
          editProfile(input:{
            email: "${NEW_EMAIL}"
          }){
            ok
            error
          }
        }`)
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.editProfile;
          expect(ok).toBeFalsy();
          expect(error).toBe('Input email already exist');
        });
    });
  });

  describe('verifyEmail', () => {
    let verificationCode: string;
    beforeAll(async () => {
      const [verification] = await verificationRepository.find(); // find first verification
      verificationCode = verification.code;
    });

    it('should verify email', () => {
      return publicTest(`
        mutation {
          verifyEmail(input:{
            code:"${verificationCode}"
          }){
            ok
            error
          }
        }`)
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.verifyEmail;
          expect(ok).toBeTruthy();
          expect(error).toBeNull();
        });
    });

    it('should fail on wrong verfication', () => {
      return publicTest(`
        mutation {
          verifyEmail(input:{
            code:"notVerify"
          }){
            ok
            error
          }
        }`)
        .expect(200)
        .expect((res) => {
          const { ok, error } = res.body.data.verifyEmail;
          expect(ok).toBeFalsy();
          expect(error).toBe('Verification not Found');
        });
    });
  });
});
