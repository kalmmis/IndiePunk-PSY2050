using System.Collections;
using System.Collections.Generic;
using UnityEngine;


//guns objects in 'Player's' hierarchy
[System.Serializable]
public class Guns
{
    public GameObject rightGun, leftGun, centralGun;
    [HideInInspector] public ParticleSystem leftGunVFX, rightGunVFX, centralGunVFX; 
}

public class PlayerShooting : MonoBehaviour {

    [Tooltip("shooting frequency. the higher the more frequent")]
    public float fireRate;

    [Tooltip("projectile prefab")]
    public GameObject projectileObject;

    //time for a new shot
    [HideInInspector] public float nextFire;


    [Tooltip("current weapon power")]
    public int weaponUpgradeIntervalOfFrame;
    [Range(1, 4)]       //change it if you wish
    [HideInInspector] public int weaponPower = 1;
    [HideInInspector] public int timeScaleUp = 1;
    [HideInInspector] public int startAttackTimestamp;

    public Guns guns;
    public bool ShootingIsActive = true; 
    public int maxweaponPower = 4; 
    public static PlayerShooting instance;
    Player playerScript;
    private void Awake()
    {
        if (instance == null)
            instance = this;
    }
    private void Start()
    {
        //receiving shooting visual effects components
        guns.leftGunVFX = guns.leftGun.GetComponent<ParticleSystem>();
        guns.rightGunVFX = guns.rightGun.GetComponent<ParticleSystem>();
        guns.centralGunVFX = guns.centralGun.GetComponent<ParticleSystem>();
        playerScript = gameObject.GetComponent<Player>();
    }

    private void Update()
    {
        if (ShootingIsActive && playerScript.isAttackMode)
        {
            if (Time.time > nextFire)
            {
                MakeAShot();                                                         
                nextFire = Time.time + 1 / fireRate;
                //Debug.Log("Time.framecount " + Time.frameCount + " attack timestamp startAttackTimestamp "+ startAttackTimestamp);
                if ((Time.frameCount - startAttackTimestamp) > weaponUpgradeIntervalOfFrame && weaponPower < maxweaponPower)
                {
                    startAttackTimestamp = Time.frameCount;
                    //Debug.Log("weaponPower is" + weaponPower + "maxweaponPower is :" + maxweaponPower);
                    weaponPower += 1;
                    timeScaleUp += 1;
                }
            }
        }
    }
    public void ResetWeaponPower()
    {
        weaponPower = 1;
        startAttackTimestamp = 0;
        //Invoke("TimeReset", 0.15f);
    }
    public IEnumerator TimeReset()
    {
        if (!playerScript.isAttackMode) {
            while (timeScaleUp > 1)
            {
                switch (timeScaleUp)
                {
                    case 1:
                        break;
                    case 2:
                        timeScaleUp = 1;
                        Time.timeScale = 1f; 
                        break;
                    case 3:
                        timeScaleUp = 2;
                        Time.timeScale = 0.9f;
                        break;
                    case 4:
                        timeScaleUp = 3;
                        Time.timeScale = 0.8f;
                        break;
                }
                yield return new WaitForSeconds(0.3333333f);
            }
        }
    }
    //method for a shot
    void MakeAShot() 
    {
        switch (timeScaleUp) // according to weapon power 'pooling' the defined anount of projectiles, on the defined position, in the defined rotation
        {
            case 1:
                CreateLazerShot(projectileObject, guns.centralGun.transform.position, Vector3.zero);
                guns.centralGunVFX.Play();
                Time.timeScale = 1f;
                break;

            case 2:
                CreateLazerShot(projectileObject, guns.centralGun.transform.position, Vector3.zero);
                guns.leftGunVFX.Play();
                /*CreateLazerShot(projectileObject, guns.leftGun.transform.position, Vector3.zero);
                guns.rightGunVFX.Play();*/
                if(playerScript != null)
                Instantiate(playerScript.timeslowEFX, transform.position, Quaternion.identity);
                Time.timeScale = 0.9f;
                break;
            case 3:
                CreateLazerShot(projectileObject, guns.centralGun.transform.position, Vector3.zero);
                guns.leftGunVFX.Play();
                //CreateLazerShot(projectileObject, guns.centralGun.transform.position, Vector3.zero);

                /*CreateLazerShot(projectileObject, guns.leftGun.transform.position, Vector3.zero);
                CreateLazerShot(projectileObject, guns.rightGun.transform.position, Vector3.zero);
                guns.centralGunVFX.Play();
                
                guns.leftGunVFX.Play();
                CreateLazerShot(projectileObject, guns.leftGun.transform.position, new Vector3(0, 0, 3));
                guns.rightGunVFX.Play(); */
                Time.timeScale = 0.8f;
                break;
            case 4:
                CreateLazerShot(projectileObject, guns.centralGun.transform.position, Vector3.zero);
                guns.leftGunVFX.Play();
                /*CreateLazerShot(projectileObject, guns.leftGun.transform.position, Vector3.zero);
                CreateLazerShot(projectileObject, guns.rightGun.transform.position, Vector3.zero);
                guns.centralGunVFX.Play();
                CreateLazerShot(projectileObject, guns.rightGun.transform.position, new Vector3(0, 0, -3));
                CreateLazerShot(projectileObject, guns.rightGun.transform.position, new Vector3(0, 0, -5));
                guns.leftGunVFX.Play();
                CreateLazerShot(projectileObject, guns.leftGun.transform.position, new Vector3(0, 0, 3));
                CreateLazerShot(projectileObject, guns.leftGun.transform.position, new Vector3(0, 0, 5));
                guns.rightGunVFX.Play();*/
                Time.timeScale = 0.7f;
                break;
        }
    }

    void CreateLazerShot(GameObject lazer, Vector3 pos, Vector3 rot) //translating 'pooled' lazer shot to the defined position in the defined rotation
    {
        Instantiate(lazer, pos, Quaternion.Euler(rot)).GetComponent<DirectMoving>().moveFunc = (Transform t) =>
        {
            t.Translate(Vector3.up * 5f * fireRate * Time.deltaTime);
        };
    }
}
