"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knex_1 = __importDefault(require("knex"));
const knex = (0, knex_1.default)({
    client: 'sqlite3',
    connection: {
        filename: './db.sqlite',
    },
    useNullAsDefault: true,
});
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Testing insert into users...');
            yield knex('users').insert({
                id: 'repro_id_' + Date.now(),
                username: 'repro_user',
                display_name: 'Repro User',
                created_at: new Date(),
                updated_at: new Date()
            }).onConflict('id').ignore();
            console.log('Insert succeeded!');
        }
        catch (error) {
            console.error('Insert failed:', error);
        }
        finally {
            yield knex.destroy();
        }
    });
}
test();
