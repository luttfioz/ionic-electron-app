import { Component, OnInit, NgZone, ViewChild } from '@angular/core';
import { Address } from '../address';
import { MapsService } from '../maps.service';
import { MouseEvent } from '@agm/core';
import { StorageService } from '../storage.service';
import { AlertController, IonInput, ToastController } from '@ionic/angular';
import { ElectronService } from 'ngx-electron';
import { Validators, FormGroup, FormBuilder } from '@angular/forms';
import { Endpoint } from '../endpoint';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  endpoint: Endpoint = {};
  endpointForm: FormGroup;
  @ViewChild('endpointName', { static: false }) nameField: IonInput;

  selectedAddress: Address = {
    addressLine1: '4 Yawkey Way',
    city: 'Boston',
    state: 'MA',
    zipCode: '02215',
    latitude: '42.3466764',
    longitude: '-71.0994065'
  };
  addresses: Address[] = [];
  highlightedAddress: Address;

  constructor(
    private alertController: AlertController,
    private electron: ElectronService,
    private fb: FormBuilder,
    private maps: MapsService,
    private ngZone: NgZone,
    private storage: StorageService,
    private toastController: ToastController) {
    this.initEndpointForm();
  }

  initEndpointForm() {
    const phonePattern = /^1[0-9]{10}$/;

    this.endpointForm = this.fb.group({
      name: [this.endpoint.name, Validators.required],
      elin: [this.endpoint.elin, [Validators.required, Validators.pattern(phonePattern)]]
    });
  }

  async ngOnInit() {
    this.addresses = await this.storage.getAddresses();

    await this.loadEndpoint();
    if (!this.endpoint.name) {
      this.promptForInfo();
    }

    if (this.electron.isElectronApp) {
      this.electron.ipcRenderer.on('setAddress', (evt, addressId) => {
        this.ngZone.run(() => this.setAddressById(addressId));
      });
    }
  }

  async promptForInfo() {
    const toast = await this.toastController.create({
      position: 'bottom', // 'top', 'middle'
      duration: 5000,     // time in ms
      closeButtonText: 'OK',
      showCloseButton: true,
      header: 'Provide Your Info',
      message: 'Pinpoint needs your name and phone number to set your current address.'
    });
    this.nameField.setFocus();
    await toast.present();
  }

  highlight(address: Address) {
    this.highlightedAddress = address;
  }

  async setAddressById(addressId: string) {
    const address = await this.storage.getAddress(addressId);
    if (address) {
      this.provisionAsync(address);
    }
  }

  /**
   * Promise-based function to provision an address.
   * Call this on the click event of a UI element to use the Promise-based chain.
   * @param address 
   */
  async provisionAsync(address: Address) {
    if (this.endpoint.elin && this.endpoint.name) {
      await this.storage.provisionAddressAsync(address);
      this.selectedAddress = address;
      this.highlightedAddress = address;
    } else {
      this.promptForInfo();
    } 
  }
  
  /**
   * Observable-based function to provision an address
   * Call this on the click event of a UI element to use the Observable-based chain.
   * @param address 
   */
  provision(address: Address) {
    if (this.endpoint.elin && this.endpoint.name) {
      this.storage.provisionAddress(address)
        .subscribe(a => {
          this.selectedAddress = address;
          this.highlightedAddress = address;
        });
    } else {
      this.promptForInfo();
    }
  }

  public async onMapClick(event: MouseEvent) {
    const place = event.placeId || event.coords;
    const address = await this.maps.geocode(place);
    this.highlightedAddress = await this.storage.saveAddress(address);
    this.addresses.push(this.highlightedAddress);
  }

  addressEquals(address1: Address, address2: Address): boolean {
    if (address1 && address2) {
      return address1 === address2
        || address1.addressId === address2.addressId;
    }

    return false;
  }

  async onDeleteClick(address: Address) {
    const alert = await this.alertController.create({
      header: 'Delete Address?',
      message: 'Are you sure you want to delete this address?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => console.log('canceled - do nothing')
        },
        {
          text: 'Delete it',
          handler: () => this.doDelete(address)
        }
      ]
    });

    await alert.present();
  }

  async doDelete(address: Address) {
    await this.storage.deleteAddress(address.addressId);
    this.highlightedAddress = null;
    this.addresses = this.addresses.filter(addr => addr.addressId !== address.addressId);
  }

  async saveEndpoint() {
    await this.storage.setEndpoint(this.endpointForm.value);
    return this.loadEndpoint();
  }

  async loadEndpoint() {
    this.endpoint = await this.storage.getEndpoint();
    this.endpointForm.reset(this.endpoint);
  }
}
