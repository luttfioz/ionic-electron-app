import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';
import uuid from 'uuid/v1';
import { Address } from './address';
import { ElectronService } from 'ngx-electron';
import { Endpoint } from './endpoint';
import { DispatcherService } from './dispatcher.service';
import { Observable, from, forkJoin } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StorageService {

  constructor(
    private dispatcher: DispatcherService,
    private electron: ElectronService,
    private storage: Storage) { }

  async provisionAddressAsync(address: Address): Promise<Endpoint> {
    if (!address.addressId) {
      address = await this.saveAddress(address);
    }

    const endpoint = await this.getEndpoint();
    endpoint.address = address;

    return this.dispatcher.saveEndpointAsync(endpoint);
  }

  async saveAddress(address: Address): Promise<Address> {
    if (!address.addressId) {
      address.addressId = uuid();
    }

    await this.storage.set(address.addressId, address);
    this.updateAddressMenu();
    return address;
  }

  async getAddresses(): Promise<Address[]> {
    const addresses = [];
    await this.storage.forEach(address => {
      if (address.addressId) {
        addresses.push(address);
      }
    });

    this.updateAddressMenu(addresses);
    return addresses;
  }

  getAddress(addressId: string): Promise<Address> {
    return this.storage.get(addressId);
  }

  async deleteAddress(addressId: string): Promise<any> {
    await this.storage.remove(addressId);
    this.updateAddressMenu();
  }

  async updateAddressMenu(addressList: Address[] = null) {
    if (this.electron.isElectronApp) {
      const addresses = addressList || await this.getAddresses();
      this.electron.ipcRenderer.send('addresses', addresses);
    }
  }

  setEndpoint(endpoint: Endpoint): Promise<void> {
    return this.storage.set('endpoint', endpoint);
  }

  async getEndpoint(): Promise<Endpoint> {
    const endpoint = await this.storage.get('endpoint');
    return endpoint || {};
  }

  provisionAddress(address: Address): Observable<Endpoint> {
    const save$ = from(this.saveAddress(address));
    const get$ = from(this.getEndpoint());
    const provision$ = forkJoin(save$, get$).pipe(
      mergeMap(([addr, endpoint]) => {
        endpoint.address = addr;
        return this.dispatcher.saveEndpoint(endpoint);
      }));

    return provision$;
  }
}
